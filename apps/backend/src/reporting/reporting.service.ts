import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity.js';
import { OrderStatus } from '../orders/dto/order.dto.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { MeetingRoom } from '../meeting-rooms/entities/meeting-room.entity.js';
import {
  RoomBooking,
  BookingStatus,
} from '../meeting-rooms/entities/room-booking.entity.js';
import { PurchaseOrderLine } from '../procurement/entities/purchase-order-line.entity.js';
import { PurchaseOrderStatus } from '../procurement/entities/purchase-order.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';
import { OrderLine } from '../orders/entities/order-line.entity.js';

type TrendGranularity = 'day' | 'week' | 'month' | 'year';
const GRANULARITIES: TrendGranularity[] = ['day', 'week', 'month', 'year'];

export interface OrdersReport {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface InventoryReport {
  total: number;
  belowThreshold: number;
  outOfStock: number;
}

export interface SlaReport {
  total: number;
  onTime: number;
  late: number;
  complianceRate: number;
}

export interface UserActivityReport {
  topEmployees: {
    employeeId: string;
    nameAr: string;
    nameEn: string;
    orderCount: number;
  }[];
  ordersByBranch: {
    branchId: string;
    nameAr: string;
    nameEn: string;
    orderCount: number;
  }[];
  total: number;
}

export interface MeetingRoomsReport {
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  cancellationRate: number;
  mostBookedRoomId: string | null;
  avgDurationMinutes: number;
}

export interface PurchasingReport {
  totalSpend: number;
  byProductSupplier: Array<{
    productId: string;
    supplierId: string;
    quantity: number;
    totalCost: number;
  }>;
  bySupplier: Array<{
    supplierId: string;
    quantity: number;
    totalCost: number;
  }>;
  byProduct: Array<{ productId: string; quantity: number; totalCost: number }>;
}

export interface InventoryDetailRow {
  productId: string;
  branchId: string;
  zone: string;
  locationName: string | null;
  quantity: number;
  minThreshold: number;
  maxThreshold: number | null;
  unitCost: number | null;
  stockValue: number;
}

export interface InventoryDetailReport {
  totalQuantity: number;
  totalStockValue: number;
  byProduct: Array<{ productId: string; quantity: number; stockValue: number }>;
  byProductBranch: Array<{
    productId: string;
    branchId: string;
    quantity: number;
    stockValue: number;
  }>;
  rows: InventoryDetailRow[];
}

export interface ExecutiveReport {
  kpis: {
    companiesCount: number;
    branchesCount: number;
    clientEmployeesCount: number;
    ordersCount: number;
    deliveredCount: number;
    pendingCount: number;
    rejectedCount: number;
    slaComplianceRate: number;
    avgDeliveryMinutes: number;
    totalStockValue: number;
    outOfStockCount: number;
    purchasingSpend: number;
  };
  ordersTrend: Array<{ bucket: string; count: number }>;
  slaTrend: Array<{ bucket: string; rate: number }>;
  ordersBreakdown: Array<{ status: string; count: number }>;
  topCompanies: Array<{
    companyId: string;
    orderCount: number;
    consumption: number;
    slaRate: number;
  }>;
  topProducts: Array<{ productId: string; orderCount: number }>;
}

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(MeetingRoom)
    private readonly roomRepo: Repository<MeetingRoom>,
    @InjectRepository(RoomBooking)
    private readonly bookingRepo: Repository<RoomBooking>,
    @InjectRepository(PurchaseOrderLine)
    private readonly poLineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(OrderLine)
    private readonly orderLineRepo: Repository<OrderLine>,
  ) {}

  async getOrdersReport(
    companyId: string,
    opts: { branchId?: string; from?: string; to?: string } = {},
  ): Promise<OrdersReport> {
    const baseQb = this.orderRepo.createQueryBuilder('o');
    if (companyId) baseQb.andWhere('o.company_id = :companyId', { companyId });
    if (opts.branchId)
      baseQb.andWhere('o.branch_id = :branchId', { branchId: opts.branchId });
    if (opts.from)
      baseQb.andWhere('o.created_at >= :from', { from: opts.from });
    if (opts.to) baseQb.andWhere('o.created_at <= :to', { to: opts.to });

    const statusRows = await baseQb
      .clone()
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of statusRows) {
      const cnt = parseInt(row.count, 10);
      byStatus[row.status] = cnt;
      total += cnt;
    }

    const priorityRows = await baseQb
      .clone()
      .select('o.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.priority')
      .getRawMany<{ priority: string; count: string }>();

    const byPriority: Record<string, number> = {};
    for (const row of priorityRows) {
      byPriority[row.priority] = parseInt(row.count, 10);
    }

    return { total, byStatus, byPriority };
  }

  async getInventoryReport(
    companyId: string,
    opts: { branchId?: string } = {},
  ): Promise<InventoryReport> {
    const totalQb = this.inventoryRepo.createQueryBuilder('i');
    if (companyId) totalQb.andWhere('i.company_id = :companyId', { companyId });
    if (opts.branchId)
      totalQb.andWhere('i.branch_id = :branchId', { branchId: opts.branchId });
    const total = await totalQb.getCount();

    const belowThreshold = await totalQb
      .clone()
      .andWhere('i.quantity <= i.min_threshold')
      .getCount();

    const outOfStock = await totalQb
      .clone()
      .andWhere('i.quantity = 0')
      .getCount();

    return { total, belowThreshold, outOfStock };
  }

  async getSlaReport(
    companyId: string,
    opts: { from?: string; to?: string } = {},
  ): Promise<SlaReport> {
    const baseQb = this.orderRepo.createQueryBuilder('o');
    if (companyId) baseQb.andWhere('o.company_id = :companyId', { companyId });
    if (opts.from)
      baseQb.andWhere('o.created_at >= :from', { from: opts.from });
    if (opts.to) baseQb.andWhere('o.created_at <= :to', { to: opts.to });

    const total = await baseQb.clone().getCount();

    const onTime = await baseQb
      .clone()
      .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
      .getCount();

    const late = await baseQb
      .clone()
      .andWhere('o.status != :status', { status: OrderStatus.DELIVERED })
      .andWhere('o.sla_deadline < NOW()')
      .getCount();

    const complianceRate = total > 0 ? Math.round((onTime / total) * 100) : 100;
    return { total, onTime, late, complianceRate };
  }

  async getUserActivityReport(
    companyId: string,
    opts: {
      branchId?: string;
      from?: string;
      to?: string;
      limit?: number;
    } = {},
  ): Promise<UserActivityReport> {
    const limit = opts.limit ?? 10;

    const baseQb = this.orderRepo.createQueryBuilder('o');
    if (companyId) baseQb.andWhere('o.company_id = :companyId', { companyId });
    if (opts.branchId)
      baseQb.andWhere('o.branch_id = :branchId', { branchId: opts.branchId });
    if (opts.from)
      baseQb.andWhere('o.created_at >= :from', { from: opts.from });
    if (opts.to) baseQb.andWhere('o.created_at <= :to', { to: opts.to });

    const total = await baseQb.clone().getCount();

    const topEmployeeRows = await baseQb
      .clone()
      .select('o.employee_id', 'employeeId')
      .addSelect('COUNT(*)', 'orderCount')
      .groupBy('o.employee_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany<{ employeeId: string; orderCount: string }>();

    // orders.employee_id stocke le sub Keycloak (voir OrdersService.create),
    // pas employees.id — résolution par keycloakId avec repli sur id pour les
    // données de seed/tests plus anciennes (même convention que ailleurs).
    const employeeIds = topEmployeeRows.map((r) => r.employeeId);
    const employees = employeeIds.length
      ? await this.employeeRepo.find({
          where: [{ keycloakId: In(employeeIds) }, { id: In(employeeIds) }],
        })
      : [];
    const employeeById = new Map<string, Employee>();
    for (const e of employees) {
      if (e.keycloakId) employeeById.set(e.keycloakId, e);
      employeeById.set(e.id, e);
    }

    const topEmployees = topEmployeeRows.map((r) => {
      const employee = employeeById.get(r.employeeId);
      return {
        employeeId: r.employeeId,
        nameAr: employee
          ? `${employee.firstNameAr} ${employee.lastNameAr}`
          : r.employeeId.slice(0, 8),
        nameEn: employee
          ? `${employee.firstNameEn} ${employee.lastNameEn}`
          : r.employeeId.slice(0, 8),
        orderCount: parseInt(r.orderCount, 10),
      };
    });

    const branchRows = await baseQb
      .clone()
      .select('o.branch_id', 'branchId')
      .addSelect('COUNT(*)', 'orderCount')
      .groupBy('o.branch_id')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ branchId: string; orderCount: string }>();

    const branchIds = branchRows.map((r) => r.branchId);
    const branchesList = branchIds.length
      ? await this.branchRepo.find({ where: { id: In(branchIds) } })
      : [];
    const branchById = new Map(branchesList.map((b) => [b.id, b]));

    const ordersByBranch = branchRows.map((r) => {
      const branch = branchById.get(r.branchId);
      return {
        branchId: r.branchId,
        nameAr: branch ? branch.nameAr : r.branchId.slice(0, 8),
        nameEn: branch ? branch.nameEn : r.branchId.slice(0, 8),
        orderCount: parseInt(r.orderCount, 10),
      };
    });

    return { topEmployees, ordersByBranch, total };
  }

  async getMeetingRoomsReport(
    companyId: string,
    opts: { from?: string; to?: string } = {},
  ): Promise<MeetingRoomsReport> {
    const baseQb = this.bookingRepo.createQueryBuilder('b');
    if (companyId) baseQb.andWhere('b.company_id = :companyId', { companyId });
    if (opts.from)
      baseQb.andWhere('b.created_at >= :from', { from: opts.from });
    if (opts.to) baseQb.andWhere('b.created_at <= :to', { to: opts.to });

    const totalBookings = await baseQb.clone().getCount();
    const confirmed = await baseQb
      .clone()
      .andWhere('b.status = :s', { s: BookingStatus.CONFIRMED })
      .getCount();
    const cancelled = await baseQb
      .clone()
      .andWhere('b.status = :s', { s: BookingStatus.CANCELLED })
      .getCount();
    const cancellationRate =
      totalBookings > 0 ? Math.round((cancelled / totalBookings) * 100) : 0;

    const topRoomRows = await baseQb
      .clone()
      .select('b.room_id', 'roomId')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('b.room_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(1)
      .getRawMany<{ roomId: string; cnt: string }>();
    const mostBookedRoomId = topRoomRows[0]?.roomId ?? null;

    const durationRow = await baseQb
      .clone()
      .select(
        'AVG(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60)',
        'avgMinutes',
      )
      .getRawOne<{ avgMinutes: string | null }>();
    const avgDurationMinutes = durationRow?.avgMinutes
      ? Math.round(parseFloat(durationRow.avgMinutes))
      : 0;

    return {
      totalBookings,
      confirmed,
      cancelled,
      cancellationRate,
      mostBookedRoomId,
      avgDurationMinutes,
    };
  }

  /**
   * Rapport financier achats : quel produit est acheté chez quel fournisseur
   * et pour quel montant. Les achats sont une activité Tarhib (pas une
   * société cliente) — companyId/branchId, quand fournis, filtrent sur le
   * LIEU DE LIVRAISON du bon de commande, jamais un scope obligatoire.
   * Seuls les BdC réellement envoyés au fournisseur comptent comme "achetés"
   * (SENT/PARTIALLY_RECEIVED/RECEIVED) — DRAFT/PENDING_VALIDATION/VALIDATED
   * ne sont pas encore un achat effectif, CANCELLED n'a jamais eu lieu.
   */
  async getPurchasingReport(
    opts: {
      companyId?: string;
      branchId?: string;
      supplierId?: string;
      productId?: string;
      from?: string;
      to?: string;
    } = {},
  ): Promise<PurchasingReport> {
    const baseQb = this.poLineRepo
      .createQueryBuilder('pol')
      .innerJoin('pol.order', 'po')
      .where('po.status IN (:...statuses)', {
        statuses: [
          PurchaseOrderStatus.SENT,
          PurchaseOrderStatus.PARTIALLY_RECEIVED,
          PurchaseOrderStatus.RECEIVED,
        ],
      });
    if (opts.companyId)
      baseQb.andWhere('po.company_id = :companyId', {
        companyId: opts.companyId,
      });
    if (opts.branchId)
      baseQb.andWhere('po.branch_id = :branchId', { branchId: opts.branchId });
    if (opts.supplierId)
      baseQb.andWhere('po.supplier_id = :supplierId', {
        supplierId: opts.supplierId,
      });
    if (opts.productId)
      baseQb.andWhere('pol.product_id = :productId', {
        productId: opts.productId,
      });
    if (opts.from)
      baseQb.andWhere('po.created_at >= :from', { from: opts.from });
    if (opts.to) baseQb.andWhere('po.created_at <= :to', { to: opts.to });

    const rows = await baseQb
      .clone()
      .select('pol.product_id', 'productId')
      .addSelect('po.supplier_id', 'supplierId')
      .addSelect('SUM(pol.ordered_qty)', 'quantity')
      .addSelect(
        'SUM(pol.ordered_qty * COALESCE(pol.unit_cost, 0))',
        'totalCost',
      )
      .groupBy('pol.product_id')
      .addGroupBy('po.supplier_id')
      .orderBy('SUM(pol.ordered_qty * COALESCE(pol.unit_cost, 0))', 'DESC')
      .getRawMany<{
        productId: string;
        supplierId: string;
        quantity: string;
        totalCost: string;
      }>();

    const byProductSupplier = rows.map((r) => ({
      productId: r.productId,
      supplierId: r.supplierId,
      quantity: parseInt(r.quantity, 10),
      totalCost: parseFloat(r.totalCost),
    }));

    const totalSpend = byProductSupplier.reduce((s, r) => s + r.totalCost, 0);

    const bySupplierMap = new Map<
      string,
      { quantity: number; totalCost: number }
    >();
    const byProductMap = new Map<
      string,
      { quantity: number; totalCost: number }
    >();
    for (const r of byProductSupplier) {
      const s = bySupplierMap.get(r.supplierId) ?? {
        quantity: 0,
        totalCost: 0,
      };
      s.quantity += r.quantity;
      s.totalCost += r.totalCost;
      bySupplierMap.set(r.supplierId, s);

      const p = byProductMap.get(r.productId) ?? { quantity: 0, totalCost: 0 };
      p.quantity += r.quantity;
      p.totalCost += r.totalCost;
      byProductMap.set(r.productId, p);
    }

    const bySupplier = [...bySupplierMap.entries()]
      .map(([supplierId, v]) => ({ supplierId, ...v }))
      .sort((a, b) => b.totalCost - a.totalCost);
    const byProduct = [...byProductMap.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.totalCost - a.totalCost);

    return { totalSpend, byProductSupplier, bySupplier, byProduct };
  }

  /**
   * Rapport détaillé stock : quantité et valeur (quantité × coût unitaire
   * produit) par produit, par produit+branche, et le détail brut par
   * emplacement (branche + zone + sous-emplacement) — filtres facultatifs
   * pour ne pas surcharger la page côté admin.
   */
  async getInventoryDetailReport(
    opts: {
      companyId?: string;
      branchId?: string;
      productId?: string;
      zone?: string;
      belowThresholdOnly?: boolean;
    } = {},
  ): Promise<InventoryDetailReport> {
    const qb = this.inventoryRepo.createQueryBuilder('i');
    if (opts.companyId)
      qb.andWhere('i.company_id = :companyId', { companyId: opts.companyId });
    if (opts.branchId)
      qb.andWhere('i.branch_id = :branchId', { branchId: opts.branchId });
    if (opts.productId)
      qb.andWhere('i.product_id = :productId', { productId: opts.productId });
    if (opts.zone) qb.andWhere('i.zone = :zone', { zone: opts.zone });
    if (opts.belowThresholdOnly) qb.andWhere('i.quantity <= i.min_threshold');

    const items = await qb.getMany();

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = productIds.length
      ? await this.productRepo.find({ where: { id: In(productIds) } })
      : [];
    const unitCostByProduct = new Map(
      products.map((p) => [
        p.id,
        p.unitCost != null ? Number(p.unitCost) : null,
      ]),
    );

    const rows: InventoryDetailRow[] = items
      .map((i) => {
        const unitCost = unitCostByProduct.get(i.productId) ?? null;
        return {
          productId: i.productId,
          branchId: i.branchId,
          zone: i.zone,
          locationName: i.locationName,
          quantity: i.quantity,
          minThreshold: i.minThreshold,
          maxThreshold: i.maxThreshold,
          unitCost,
          stockValue: i.quantity * (unitCost ?? 0),
        };
      })
      .sort((a, b) => b.stockValue - a.stockValue);

    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalStockValue = rows.reduce((s, r) => s + r.stockValue, 0);

    const byProductMap = new Map<
      string,
      { quantity: number; stockValue: number }
    >();
    const byProductBranchMap = new Map<
      string,
      {
        productId: string;
        branchId: string;
        quantity: number;
        stockValue: number;
      }
    >();
    for (const r of rows) {
      const bp = byProductMap.get(r.productId) ?? {
        quantity: 0,
        stockValue: 0,
      };
      bp.quantity += r.quantity;
      bp.stockValue += r.stockValue;
      byProductMap.set(r.productId, bp);

      const key = `${r.productId}|${r.branchId}`;
      const bpb = byProductBranchMap.get(key) ?? {
        productId: r.productId,
        branchId: r.branchId,
        quantity: 0,
        stockValue: 0,
      };
      bpb.quantity += r.quantity;
      bpb.stockValue += r.stockValue;
      byProductBranchMap.set(key, bpb);
    }

    const byProduct = [...byProductMap.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.stockValue - a.stockValue);
    const byProductBranch = [...byProductBranchMap.values()].sort(
      (a, b) => b.stockValue - a.stockValue,
    );

    return { totalQuantity, totalStockValue, byProduct, byProductBranch, rows };
  }

  /**
   * Vue Exécutive (module KPI & Reporting) : indicateurs et tendances
   * globales de l'activité Tarhib. Les comptages de sociétés/branches/
   * employés reflètent l'état courant (non filtré par période) ; les
   * indicateurs de commandes/SLA/achats sont filtrés par la période
   * fournie (from/to) — companyId/branchId restent facultatifs partout.
   */
  async getExecutiveReport(
    opts: {
      companyId?: string;
      branchId?: string;
      from?: string;
      to?: string;
      granularity?: TrendGranularity;
    } = {},
  ): Promise<ExecutiveReport> {
    const granularity: TrendGranularity =
      opts.granularity && GRANULARITIES.includes(opts.granularity)
        ? opts.granularity
        : 'day';

    const companiesCount = await this.companyRepo.count({
      where: opts.companyId ? { id: opts.companyId } : {},
    });

    const branchWhere: FindOptionsWhere<Branch> = {};
    if (opts.companyId) branchWhere.companyId = opts.companyId;
    if (opts.branchId) branchWhere.id = opts.branchId;
    const branchesCount = await this.branchRepo.count({ where: branchWhere });

    const employeeWhere: FindOptionsWhere<Employee> = {
      scope: EmployeeScope.CLIENT,
    };
    if (opts.companyId) employeeWhere.companyId = opts.companyId;
    if (opts.branchId) employeeWhere.branchId = opts.branchId;
    const clientEmployeesCount = await this.employeeRepo.count({
      where: employeeWhere,
    });

    const baseQb = this.orderRepo.createQueryBuilder('o');
    if (opts.companyId)
      baseQb.andWhere('o.company_id = :companyId', {
        companyId: opts.companyId,
      });
    if (opts.branchId)
      baseQb.andWhere('o.branch_id = :branchId', { branchId: opts.branchId });
    if (opts.from)
      baseQb.andWhere('o.created_at >= :from', { from: opts.from });
    if (opts.to) baseQb.andWhere('o.created_at <= :to', { to: opts.to });

    const ordersCount = await baseQb.clone().getCount();

    const statusRows = await baseQb
      .clone()
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();
    const countByStatus = new Map(
      statusRows.map((r) => [r.status, parseInt(r.count, 10)]),
    );
    const deliveredCount = countByStatus.get(OrderStatus.DELIVERED) ?? 0;
    const pendingCount =
      (countByStatus.get(OrderStatus.PENDING) ?? 0) +
      (countByStatus.get(OrderStatus.APPROVED) ?? 0);
    const rejectedCount = countByStatus.get(OrderStatus.REJECTED) ?? 0;
    const preparingCount =
      (countByStatus.get(OrderStatus.IN_PROGRESS) ?? 0) +
      (countByStatus.get(OrderStatus.READY) ?? 0);

    const ordersBreakdown = [
      { status: 'DELIVERED', count: deliveredCount },
      { status: 'PENDING', count: pendingCount },
      { status: 'PREPARING', count: preparingCount },
      { status: 'REJECTED', count: rejectedCount },
    ];

    const deliveredQb = baseQb
      .clone()
      .andWhere('o.status = :delivered', { delivered: OrderStatus.DELIVERED })
      .andWhere('o.delivered_at IS NOT NULL');

    const deliveredTotal = await deliveredQb.clone().getCount();
    const onTimeCount = await deliveredQb
      .clone()
      .andWhere('o.delivered_at <= o.sla_deadline')
      .getCount();
    const slaComplianceRate =
      deliveredTotal > 0
        ? Math.round((onTimeCount / deliveredTotal) * 100)
        : 100;

    const avgRow = await deliveredQb
      .clone()
      .select(
        'AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60)',
        'avgMinutes',
      )
      .getRawOne<{ avgMinutes: string | null }>();
    const avgDeliveryMinutes = avgRow?.avgMinutes
      ? Math.round(parseFloat(avgRow.avgMinutes))
      : 0;

    const trendRows = await baseQb
      .clone()
      .select(`DATE_TRUNC('${granularity}', o.created_at)`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: Date; count: string }>();
    const ordersTrend = trendRows.map((r) => ({
      bucket: new Date(r.bucket).toISOString(),
      count: parseInt(r.count, 10),
    }));

    const slaTrendRows = await deliveredQb
      .clone()
      .select(`DATE_TRUNC('${granularity}', o.created_at)`, 'bucket')
      .addSelect(
        'SUM(CASE WHEN o.delivered_at <= o.sla_deadline THEN 1 ELSE 0 END)',
        'onTime',
      )
      .addSelect('COUNT(*)', 'total')
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: Date; onTime: string; total: string }>();
    const slaTrend = slaTrendRows.map((r) => ({
      bucket: new Date(r.bucket).toISOString(),
      rate: Math.round((parseInt(r.onTime, 10) / parseInt(r.total, 10)) * 100),
    }));

    const companyOrderRows = await baseQb
      .clone()
      .select('o.company_id', 'companyId')
      .addSelect('COUNT(*)', 'orderCount')
      .groupBy('o.company_id')
      .getRawMany<{ companyId: string; orderCount: string }>();

    const companySlaRows = await deliveredQb
      .clone()
      .select('o.company_id', 'companyId')
      .addSelect(
        'SUM(CASE WHEN o.delivered_at <= o.sla_deadline THEN 1 ELSE 0 END)',
        'onTime',
      )
      .addSelect('COUNT(*)', 'total')
      .groupBy('o.company_id')
      .getRawMany<{ companyId: string; onTime: string; total: string }>();
    const slaByCompany = new Map(
      companySlaRows.map((r) => [
        r.companyId,
        Math.round((parseInt(r.onTime, 10) / parseInt(r.total, 10)) * 100),
      ]),
    );

    const lineQb = this.orderLineRepo
      .createQueryBuilder('l')
      .innerJoin('l.order', 'o');
    if (opts.companyId)
      lineQb.andWhere('o.company_id = :companyId', {
        companyId: opts.companyId,
      });
    if (opts.branchId)
      lineQb.andWhere('o.branch_id = :branchId', { branchId: opts.branchId });
    if (opts.from)
      lineQb.andWhere('o.created_at >= :from', { from: opts.from });
    if (opts.to) lineQb.andWhere('o.created_at <= :to', { to: opts.to });

    const consumptionRows = await lineQb
      .clone()
      .select('o.company_id', 'companyId')
      .addSelect('SUM(l.quantity)', 'consumption')
      .groupBy('o.company_id')
      .getRawMany<{ companyId: string; consumption: string }>();
    const consumptionByCompany = new Map(
      consumptionRows.map((r) => [r.companyId, parseInt(r.consumption, 10)]),
    );

    const topCompanies = companyOrderRows
      .map((r) => ({
        companyId: r.companyId,
        orderCount: parseInt(r.orderCount, 10),
        consumption: consumptionByCompany.get(r.companyId) ?? 0,
        slaRate: slaByCompany.get(r.companyId) ?? 0,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    const productRows = await lineQb
      .clone()
      .select('l.product_id', 'productId')
      .addSelect('COUNT(*)', 'orderCount')
      .groupBy('l.product_id')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany<{ productId: string; orderCount: string }>();
    const topProducts = productRows.map((r) => ({
      productId: r.productId,
      orderCount: parseInt(r.orderCount, 10),
    }));

    const invDetail = await this.getInventoryDetailReport({
      companyId: opts.companyId,
      branchId: opts.branchId,
    });
    const totalStockValue = invDetail.totalStockValue;
    const outOfStockCount = invDetail.rows.filter(
      (r) => r.quantity === 0,
    ).length;

    const purchasing = await this.getPurchasingReport({
      companyId: opts.companyId,
      branchId: opts.branchId,
      from: opts.from,
      to: opts.to,
    });

    return {
      kpis: {
        companiesCount,
        branchesCount,
        clientEmployeesCount,
        ordersCount,
        deliveredCount,
        pendingCount,
        rejectedCount,
        slaComplianceRate,
        avgDeliveryMinutes,
        totalStockValue,
        outOfStockCount,
        purchasingSpend: purchasing.totalSpend,
      },
      ordersTrend,
      slaTrend,
      ordersBreakdown,
      topCompanies,
      topProducts,
    };
  }
}
