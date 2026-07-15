import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { Order } from './entities/order.entity.js';
import {
  OrderLine,
  LineValidationStatus,
} from './entities/order-line.entity.js';
import {
  CreateOrderDto,
  OrderDto,
  OrderLineDto,
  OrderPriority,
  OrderStatus,
} from './dto/order.dto.js';
import {
  ValidationEngineService,
  ValidationContext,
} from './validation-engine/validation-engine.service.js';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationsGateway } from '../notifications/notifications.gateway.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductType } from '../products/dto/product.dto.js';
import {
  InventoryItem,
  StockZone,
} from '../inventory/entities/inventory-item.entity.js';
import { Quota } from '../quotas/entities/quota.entity.js';
import { QuotasService } from '../quotas/quotas.service.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';
import { PrioritySlaService } from '../priority-sla/priority-sla.service.js';
import { Role } from '../roles/entities/role.entity.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderLine)
    private readonly lineRepo: Repository<OrderLine>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Quota)
    private readonly quotaRepo: Repository<Quota>,
    @InjectRepository(EmployeeQuotaUsage)
    private readonly quotaUsageRepo: Repository<EmployeeQuotaUsage>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly quotasService: QuotasService,
    private readonly validationEngine: ValidationEngineService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly prioritySla: PrioritySlaService,
  ) {}

  /**
   * Priorité SLA de la commande = niveau SLA du rôle de l'employé
   * (roles.sla_priority, cf. §"مستويات الأولوية موجودة لكل دور" — chaque
   * rôle porte son propre niveau P1..P5). Défaut P5 si le rôle n'a pas ce
   * champ renseigné ou n'a pas pu être résolu.
   */
  private async resolveOrderPriority(caller: JwtPayload): Promise<string> {
    if (!caller.roleId) return OrderPriority.P5;
    const role = await this.roleRepo.findOne({ where: { id: caller.roleId } });
    return role?.slaPriority || OrderPriority.P5;
  }

  async create(dto: CreateOrderDto, caller: JwtPayload): Promise<OrderDto> {
    const productIds = dto.lines.map((l) => l.productId);

    // Charge les vraies données (§3.3 CLAUDE.md — ordre strict)
    const [products, stocks] = await Promise.all([
      this.productRepo.find({ where: productIds.map((id) => ({ id })) }),
      this.inventoryRepo.find({
        where: productIds.map((id) => ({
          productId: id,
          branchId: caller.branchId || undefined,
          companyId: caller.companyId || undefined,
          zone: StockZone.BRANCH, // §9 CLAUDE.md : vérification au niveau Branche
        })),
      }),
    ]);

    // Quota system: prefer new role-based quotas, fallback to legacy per-employee quotas
    const quotaSnapshots = await this.quotasService.snapshotsFor(
      caller,
      productIds,
    );

    const ctx: ValidationContext = {
      employeeId: caller.sub,
      companyId: caller.companyId || '',
      branchId: caller.branchId || '',
      role: caller.role || 'EMPLOYEE',
      roleId: caller.roleId ?? null,
      products: products.map((p) => ({
        id: p.id,
        type:
          p.type === ProductType.LIBRE_SERVICE_VIP
            ? 'LIBRE_SERVICE_VIP'
            : 'COMMANDABLE',
        allowedRoles: p.allowedRoles,
        allowedBranches: p.allowedBranches,
        active: p.active,
      })),
      stocks: stocks.map((s) => ({
        productId: s.productId,
        branchId: s.branchId,
        quantity: s.quantity,
      })),
      quotas: quotaSnapshots,
    };

    const validation = this.validationEngine.validateCart(ctx, dto.lines);

    const rejectedLines = validation.lines.filter(
      (l) => l.decision === 'REJECTED',
    );
    if (rejectedLines.length === dto.lines.length) {
      throw new UnprocessableEntityException({
        message: 'orderValidationFailed',
        rejectedLines,
      });
    }

    const priority = await this.resolveOrderPriority(caller);
    // SLA personnalisé par entreprise (company_sla_levels), sinon défauts globaux
    const slaMinutes = await this.prioritySla.getSlaMinutes(
      caller.companyId,
      priority,
    );
    const slaDeadline = new Date(Date.now() + slaMinutes * 60_000);

    // Moteur de validation (CLAUDE.md §3.3) : rejet automatique de la ligne
    // fautive (rôle non autorisé, stock insuffisant, quota dépassé — quota
    // vérifié uniquement s'il existe pour l'employé), jamais de blocage du
    // panier entier pour une seule ligne en faute. La décision est
    // entièrement automatique — aucune ligne rejetée n'attend l'arbitrage
    // d'un Department Manager : la commande est validée immédiatement dès
    // qu'il reste au moins une ligne valide, les lignes rejetées restent
    // visibles avec leur motif (l'employé les retire de ses prochains
    // paniers, cf. affichage mobile order_line_tile.dart).
    const now = new Date();

    const order = this.orderRepo.create({
      employeeId: caller.sub,
      companyId: caller.companyId,
      branchId: caller.branchId,
      priority,
      slaDeadline,
      note: dto.note?.trim() || null,
      status: OrderStatus.APPROVED,
      approvedAt: now,
      lines: dto.lines.map((l) => {
        const validationLine = validation.lines.find(
          (v) => v.productId === l.productId,
        );
        const line = this.lineRepo.create({
          productId: l.productId,
          quantity: l.quantity,
          validationStatus:
            validationLine?.decision === 'REJECTED'
              ? LineValidationStatus.REJECTED
              : LineValidationStatus.APPROVED,
          rejectionReason: validationLine?.reason ?? null,
        });
        return line;
      }),
    });

    const saved = await this.orderRepo.save(order);

    // Incrémente la consommation pour les lignes APPROVED
    const approvedLines = saved.lines.filter(
      (l) => l.validationStatus === LineValidationStatus.APPROVED,
    );
    if (approvedLines.length > 0) {
      await this.incrementQuotaUsage(
        caller,
        approvedLines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
      );
    }

    this.notificationsGateway.emitOrderUpdate('order:new', {
      orderId: saved.id,
      branchId: saved.branchId,
    });

    return this.toDto(saved);
  }

  /**
   * Commandes de l'appelant uniquement — le filtre employeeId est imposé
   * côté serveur (jamais de confiance au query param, règle §3.4 CLAUDE.md).
   */
  findMine(caller: JwtPayload, status?: string): Promise<OrderDto[]> {
    return this.findAll(undefined, caller.sub, status);
  }

  async findAll(
    companyId?: string,
    employeeId?: string,
    status?: string,
  ): Promise<OrderDto[]> {
    const where: FindOptionsWhere<Order> = {};
    if (companyId) where.companyId = companyId;
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status as OrderStatus;
    const orders = await this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['lines'],
    });
    return orders.map((o) => this.toDto(o));
  }

  async dashboardStats(caller: JwtPayload): Promise<{
    todayOrders: number;
    pendingCount: number;
    deliveredToday: number;
    avgSlaMinutes: number;
    mostOrdered: Array<{ productId: string; name: string; count: number }>;
  }> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const where: FindOptionsWhere<Order> = {
      createdAt: Between(start, end),
    };
    if (!this.isPlatformAdmin(caller)) {
      if (caller.companyId) where.companyId = caller.companyId;
      if (caller.branchId) where.branchId = caller.branchId;
    }

    const orders = await this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['lines'],
    });

    const delivered = orders.filter(
      (order) => order.status === OrderStatus.DELIVERED,
    );
    const pending = orders.filter((order) =>
      [OrderStatus.PENDING, OrderStatus.APPROVED].includes(order.status),
    );

    const deliveryDurations = delivered
      .map((order) =>
        order.prepStartedAt && order.deliveredAt
          ? (order.deliveredAt.getTime() - order.prepStartedAt.getTime()) /
            60_000
          : null,
      )
      .filter(
        (duration): duration is number =>
          typeof duration === 'number' && Number.isFinite(duration),
      );

    const productCounts = new Map<string, number>();
    for (const order of orders) {
      for (const line of order.lines ?? []) {
        productCounts.set(
          line.productId,
          (productCounts.get(line.productId) ?? 0) + Number(line.quantity ?? 0),
        );
      }
    }

    const topProductIds = [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId]) => productId);

    const products = topProductIds.length
      ? await this.productRepo.find({ where: { id: In(topProductIds) } })
      : [];
    const namesById = new Map(
      products.map((product) => [product.id, product.nameEn || product.nameAr]),
    );

    return {
      todayOrders: orders.length,
      pendingCount: pending.length,
      deliveredToday: delivered.length,
      avgSlaMinutes: deliveryDurations.length
        ? deliveryDurations.reduce((sum, value) => sum + value, 0) /
          deliveryDurations.length
        : 0,
      mostOrdered: topProductIds.map((productId) => ({
        productId,
        name: namesById.get(productId) ?? productId,
        count: productCounts.get(productId) ?? 0,
      })),
    };
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    caller: JwtPayload,
    reason?: string,
  ): Promise<OrderDto> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const allowed = this.allowedTransitions(caller, order.status);
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Role ${caller.role} cannot transition ${order.status} → ${status}`,
      );
    }
    // Un admin plateforme (superadmin) n'a aucune société assignée
    // (caller.companyId est null) : il gère toutes les sociétés et ne doit
    // donc jamais être bloqué par la vérification multi-tenant — même règle
    // que RolesService.findAll (cf. isTarhibAdmin).
    if (!this.isPlatformAdmin(caller) && order.companyId !== caller.companyId) {
      throw new ForbiddenException('crossTenantAccessDenied');
    }

    order.status = status;
    if (reason?.trim()) order.note = reason.trim();
    const now = new Date();
    if (status === OrderStatus.APPROVED) {
      order.approvedAt = now;
      order.approvedBy = caller.sub;
    } else if (status === OrderStatus.REJECTED) {
      order.rejectedAt = now;
      order.rejectedBy = caller.sub;
    } else if (status === OrderStatus.IN_PROGRESS) {
      order.prepStartedAt = now;
      order.preparedBy = caller.sub;
    } else if (status === OrderStatus.READY) {
      order.readyAt = now;
      order.readyBy = caller.sub;
    } else if (status === OrderStatus.DELIVERED) {
      order.deliveredAt = now;
      order.deliveredBy = caller.sub;
    }
    const saved = await this.orderRepo.save(order);

    // Notify employee via SMS + push FCM (TARHIB-9) — fire-and-forget,
    // don't block the response. orders.employee_id porte l'identité Keycloak
    // de l'appelant (cf. create), d'où la recherche keycloakId OU id.
    this.employeeRepo
      .findOne({
        where: [{ keycloakId: order.employeeId }, { id: order.employeeId }],
      })
      .then(async (employee) => {
        if (!employee) return;
        if (employee.phoneNumber) {
          await this.notificationsService.notifyOrderStatusChanged(
            order.id,
            status,
            employee.phoneNumber,
          );
        }
        if (employee.fcmToken) {
          await this.notificationsService.sendPush(
            employee.fcmToken,
            'Tarhib',
            `Commande #${order.id.slice(0, 8)} — nouveau statut : ${status}`,
            { orderId: order.id, type: 'order-status' },
          );
        }
      })
      .catch((err: unknown) =>
        this.logger.error(
          `Notification failed for order ${order.id}: ${String(err)}`,
        ),
      );

    this.notificationsGateway.emitOrderUpdate('order:status', {
      orderId: saved.id,
      status: saved.status,
      branchId: saved.branchId,
    });

    return this.toDto(saved);
  }

  /**
   * Admin plateforme Tarhib (superadmin inclus) : n'a aucune société
   * assignée et ne doit être cantonné ni par le moteur de transitions ni
   * par la vérification multi-tenant (même détection que allowedTransitions).
   */
  private isPlatformAdmin(caller: JwtPayload): boolean {
    const perms = caller.permissions ?? [];
    return (
      perms.includes('company.manage') ||
      perms.includes('employee.manage') ||
      caller.role === 'ADMIN'
    );
  }

  private allowedTransitions(
    caller: JwtPayload,
    current: OrderStatus,
  ): OrderStatus[] {
    const perms = caller.permissions ?? [];

    const canPrepare = perms.includes('order.prepare');
    const canDeliver = perms.includes('order.deliver');
    const canApprove = perms.includes('order.approve');

    // Backward compat: legacy role strings
    const legacyAgent = caller.role === 'HOSPITALITY_AGENT';
    const legacyManager = caller.role === 'DEPARTMENT_MANAGER';

    if (this.isPlatformAdmin(caller)) {
      const full: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [
          OrderStatus.APPROVED,
          OrderStatus.IN_PROGRESS,
          OrderStatus.REJECTED,
        ],
        [OrderStatus.APPROVED]: [OrderStatus.IN_PROGRESS, OrderStatus.REJECTED],
        [OrderStatus.IN_PROGRESS]: [OrderStatus.READY, OrderStatus.REJECTED],
        [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.REJECTED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      };
      return full[current] ?? [];
    }

    if (canApprove || legacyManager) {
      const approver: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.APPROVED, OrderStatus.REJECTED],
        [OrderStatus.APPROVED]: [OrderStatus.REJECTED],
        [OrderStatus.IN_PROGRESS]: [],
        [OrderStatus.READY]: [],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      };
      return approver[current] ?? [];
    }

    if (canPrepare || canDeliver || legacyAgent) {
      // Cuisinier (order.prepare) : APPROVED→IN_PROGRESS→READY
      // Livreur (order.deliver) : READY→DELIVERED
      const agent: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS],
        [OrderStatus.APPROVED]: [OrderStatus.IN_PROGRESS],
        [OrderStatus.IN_PROGRESS]: canPrepare
          ? [OrderStatus.READY, OrderStatus.REJECTED]
          : [],
        [OrderStatus.READY]: canDeliver ? [OrderStatus.DELIVERED] : [],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      };
      return agent[current] ?? [];
    }

    return [];
  }

  async findOne(id: string): Promise<OrderDto> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return this.toDto(order);
  }

  private async incrementQuotaUsage(
    caller: JwtPayload,
    lines: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    const today = new Date();
    const periodStart = today.toISOString().slice(0, 10);
    // Period end: end of current month
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    if (caller.roleId) {
      for (const line of lines) {
        await this.quotaUsageRepo
          .createQueryBuilder()
          .insert()
          .into(EmployeeQuotaUsage)
          .values({
            employeeId: caller.sub,
            productId: line.productId,
            companyId: caller.companyId,
            periodStart,
            periodEnd,
            usedQuantity: line.quantity,
          })
          .orUpdate(
            ['used_quantity'],
            [
              'employee_id',
              'product_id',
              'company_id',
              'period_start',
              'period_end',
            ],
          )
          .execute()
          .catch(() =>
            this.quotaUsageRepo.query(
              `UPDATE employee_quota_usage SET used_quantity = used_quantity + $1
               WHERE employee_id = $2 AND product_id = $3 AND company_id = $4
                 AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE`,
              [line.quantity, caller.sub, line.productId, caller.companyId],
            ),
          );
      }
      return;
    }

    // Legacy fallback
    for (const line of lines) {
      await this.quotaRepo
        .createQueryBuilder()
        .update()
        .set({ usedQuantity: () => 'used_quantity + :qty' })
        .where('employee_id = :empId', { empId: caller.sub })
        .andWhere('product_id = :productId', { productId: line.productId })
        .andWhere('period_start <= CURRENT_DATE')
        .andWhere('period_end >= CURRENT_DATE')
        .setParameter('qty', line.quantity)
        .execute();
    }
  }

  private toDto(o: Order): OrderDto {
    const dto = new OrderDto();
    dto.id = o.id;
    dto.employeeId = o.employeeId;
    dto.branchId = o.branchId;
    dto.companyId = o.companyId;
    dto.status = o.status;
    dto.priority = o.priority;
    dto.slaDeadline = o.slaDeadline.toISOString();
    dto.createdAt = o.createdAt.toISOString();
    dto.approvedAt = o.approvedAt;
    dto.approvedBy = o.approvedBy;
    dto.rejectedAt = o.rejectedAt;
    dto.rejectedBy = o.rejectedBy;
    dto.prepStartedAt = o.prepStartedAt;
    dto.preparedBy = o.preparedBy;
    dto.readyAt = o.readyAt;
    dto.readyBy = o.readyBy;
    dto.deliveredAt = o.deliveredAt;
    dto.deliveredBy = o.deliveredBy;
    dto.note = o.note ?? null;
    dto.lines = (o.lines ?? []).map((l) => {
      const line = new OrderLineDto();
      line.productId = l.productId;
      line.quantity = l.quantity;
      line.validationStatus = l.validationStatus;
      line.rejectionReason = l.rejectionReason ?? null;
      return line;
    });
    return dto;
  }
}
