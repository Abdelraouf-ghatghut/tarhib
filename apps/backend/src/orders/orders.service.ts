import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Order } from './entities/order.entity.js';
import {
  OrderLine,
  LineValidationStatus,
} from './entities/order-line.entity.js';
import {
  CreateOrderDto,
  OrderDto,
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
import { RoleQuota } from '../roles/entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';
import { PrioritySlaService } from '../priority-sla/priority-sla.service.js';

function resolveOrderPriority(caller: JwtPayload): string {
  // Use the role's sla_priority if carried in JWT (set via EnrichUserInterceptor from role.slaPriority)
  // Any company SLA level code is accepted (defaults P1..P5 or custom codes)
  // Fallback to legacy role string for backward compat
  const slaPriority = caller.slaPriority;
  if (slaPriority?.trim()) return slaPriority;

  const legacyMap: Record<string, OrderPriority> = {
    ADMIN: OrderPriority.P1,
    DEPARTMENT_MANAGER: OrderPriority.P2,
    INVENTORY_MANAGER: OrderPriority.P3,
    HOSPITALITY_AGENT: OrderPriority.P3,
    EMPLOYEE: OrderPriority.P5,
  };
  return legacyMap[caller.role] ?? OrderPriority.P5;
}

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
    @InjectRepository(RoleQuota)
    private readonly roleQuotaRepo: Repository<RoleQuota>,
    @InjectRepository(EmployeeQuotaUsage)
    private readonly quotaUsageRepo: Repository<EmployeeQuotaUsage>,
    private readonly validationEngine: ValidationEngineService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly prioritySla: PrioritySlaService,
  ) {}

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
    const quotaSnapshots = await this.buildQuotaSnapshots(caller, productIds);

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

    if (validation.overallDecision === 'PARTIALLY_REJECTED') {
      const rejected = validation.lines.filter(
        (l) => l.decision === 'REJECTED',
      );
      if (rejected.length === dto.lines.length) {
        throw new UnprocessableEntityException({
          message: 'All order lines were rejected by the validation engine',
          rejectedLines: rejected,
        });
      }
    }

    const priority = resolveOrderPriority(caller);
    // SLA personnalisé par entreprise (company_sla_levels), sinon défauts globaux
    const slaMinutes = await this.prioritySla.getSlaMinutes(
      caller.companyId,
      priority,
    );
    const slaDeadline = new Date(Date.now() + slaMinutes * 60_000);

    const order = this.orderRepo.create({
      employeeId: caller.sub,
      companyId: caller.companyId,
      branchId: caller.branchId,
      priority,
      slaDeadline,
      status: OrderStatus.PENDING,
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

  async updateStatus(
    id: string,
    status: OrderStatus,
    caller: JwtPayload,
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
    if (order.companyId !== caller.companyId) {
      throw new ForbiddenException('crossTenantAccessDenied');
    }

    order.status = status;
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

    // Notify employee via SMS (TARHIB-9) — fire-and-forget, don't block the response
    this.employeeRepo
      .findOne({ where: { id: order.employeeId } })
      .then((employee) => {
        if (employee?.phoneNumber) {
          return this.notificationsService.notifyOrderStatusChanged(
            order.id,
            status,
            employee.phoneNumber,
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

  private allowedTransitions(
    caller: JwtPayload,
    current: OrderStatus,
  ): OrderStatus[] {
    const perms = caller.permissions ?? [];

    const canPrepare =
      perms.includes('order.prepare') || perms.includes('order.queue.manage');
    const canDeliver =
      perms.includes('order.deliver') || perms.includes('order.queue.manage');
    const canApprove = perms.includes('order.approve');
    const isAdmin =
      perms.includes('company.manage') || perms.includes('employee.manage');

    // Backward compat: legacy role strings
    const legacyAgent = caller.role === 'HOSPITALITY_AGENT';
    const legacyManager = caller.role === 'DEPARTMENT_MANAGER';
    const legacyAdmin = caller.role === 'ADMIN';

    if (isAdmin || legacyAdmin) {
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

  private async buildQuotaSnapshots(
    caller: JwtPayload,
    productIds: string[],
  ): Promise<
    Array<{
      employeeId: string;
      productId: string;
      maxQuantity: number;
      usedQuantity: number;
    }>
  > {
    const today = new Date().toISOString().slice(0, 10);

    // New role-based quota system
    if (caller.roleId) {
      const [roleQuotas, usages] = await Promise.all([
        this.roleQuotaRepo
          .createQueryBuilder('rq')
          .where('rq.role_id = :roleId', { roleId: caller.roleId })
          .andWhere('rq.product_id IN (:...productIds)', { productIds })
          .andWhere('rq.company_id = :companyId', {
            companyId: caller.companyId,
          })
          .getMany(),
        this.quotaUsageRepo
          .createQueryBuilder('u')
          .where('u.employee_id = :empId', { empId: caller.sub })
          .andWhere('u.product_id IN (:...productIds)', { productIds })
          .andWhere('u.period_start <= :today', { today })
          .andWhere('u.period_end >= :today', { today })
          .getMany(),
      ]);

      return roleQuotas.map((rq) => {
        const usage = usages.find((u) => u.productId === rq.productId);
        return {
          employeeId: caller.sub,
          productId: rq.productId,
          maxQuantity: rq.maxQuantity,
          usedQuantity: usage?.usedQuantity ?? 0,
        };
      });
    }

    // Legacy per-employee quotas fallback
    const legacy = await this.quotaRepo
      .createQueryBuilder('q')
      .where('q.employee_id = :employeeId', { employeeId: caller.sub })
      .andWhere('q.product_id IN (:...productIds)', { productIds })
      .andWhere('q.period_start <= :today', { today })
      .andWhere('q.period_end >= :today', { today })
      .getMany();

    return legacy.map((q) => ({
      employeeId: q.employeeId,
      productId: q.productId,
      maxQuantity: q.maxQuantity,
      usedQuantity: q.usedQuantity,
    }));
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
    dto.lines = o.lines ?? [];
    return dto;
  }
}
