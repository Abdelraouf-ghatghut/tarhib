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
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { Quota } from '../quotas/entities/quota.entity.js';

const PRIORITY_SLA_MINUTES: Record<OrderPriority, number> = {
  [OrderPriority.P1]: 10,
  [OrderPriority.P2]: 20,
  [OrderPriority.P3]: 30,
  [OrderPriority.P4]: 45,
  [OrderPriority.P5]: 60,
};

const ROLE_PRIORITY: Record<string, OrderPriority> = {
  ADMIN: OrderPriority.P1,
  DEPARTMENT_MANAGER: OrderPriority.P2,
  INVENTORY_MANAGER: OrderPriority.P3,
  HOSPITALITY_AGENT: OrderPriority.P3,
  EMPLOYEE: OrderPriority.P5,
};

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
    private readonly validationEngine: ValidationEngineService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(dto: CreateOrderDto, caller: JwtPayload): Promise<OrderDto> {
    const productIds = dto.lines.map((l) => l.productId);

    // Charge les vraies données (§3.3 CLAUDE.md — ordre strict)
    const [products, stocks, quotas] = await Promise.all([
      this.productRepo.find({ where: productIds.map((id) => ({ id })) }),
      this.inventoryRepo.find({
        where: productIds.map((id) => ({
          productId: id,
          branchId: caller.branchId || undefined,
          companyId: caller.companyId || undefined,
        })),
      }),
      this.quotaRepo
        .createQueryBuilder('q')
        .where('q.employee_id = :employeeId', { employeeId: caller.sub })
        .andWhere('q.product_id IN (:...productIds)', { productIds })
        .andWhere('q.period_start <= CURRENT_DATE')
        .andWhere('q.period_end >= CURRENT_DATE')
        .getMany(),
    ]);

    const ctx: ValidationContext = {
      employeeId: caller.sub,
      companyId: caller.companyId || '',
      branchId: caller.branchId || '',
      role: caller.role || 'EMPLOYEE',
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
      quotas: quotas.map((q) => ({
        employeeId: q.employeeId,
        productId: q.productId,
        maxQuantity: q.maxQuantity,
        usedQuantity: q.usedQuantity,
      })),
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

    const priority = ROLE_PRIORITY[caller.role] ?? OrderPriority.P5;
    const slaMinutes = PRIORITY_SLA_MINUTES[priority];
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

    // Incrémente usedQuantity pour les lignes APPROVED
    const approvedLines = saved.lines.filter(
      (l) => l.validationStatus === LineValidationStatus.APPROVED,
    );
    if (approvedLines.length > 0) {
      for (const line of approvedLines) {
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

    const allowed = this.allowedTransitions(caller.role, order.status);
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Role ${caller.role} cannot transition ${order.status} → ${status}`,
      );
    }
    if (order.companyId !== caller.companyId) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    order.status = status;
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
    role: string,
    current: OrderStatus,
  ): OrderStatus[] {
    const map: Record<string, Record<OrderStatus, OrderStatus[]>> = {
      HOSPITALITY_AGENT: {
        [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS],
        [OrderStatus.APPROVED]: [OrderStatus.IN_PROGRESS],
        [OrderStatus.IN_PROGRESS]: [
          OrderStatus.DELIVERED,
          OrderStatus.REJECTED,
        ],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      },
      DEPARTMENT_MANAGER: {
        [OrderStatus.PENDING]: [OrderStatus.APPROVED, OrderStatus.REJECTED],
        [OrderStatus.APPROVED]: [OrderStatus.REJECTED],
        [OrderStatus.IN_PROGRESS]: [],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      },
      ADMIN: {
        [OrderStatus.PENDING]: [
          OrderStatus.APPROVED,
          OrderStatus.IN_PROGRESS,
          OrderStatus.REJECTED,
        ],
        [OrderStatus.APPROVED]: [OrderStatus.IN_PROGRESS, OrderStatus.REJECTED],
        [OrderStatus.IN_PROGRESS]: [
          OrderStatus.DELIVERED,
          OrderStatus.REJECTED,
        ],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.REJECTED]: [],
      },
    };
    return map[role]?.[current] ?? [];
  }

  async findOne(id: string): Promise<OrderDto> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return this.toDto(order);
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
    dto.lines = o.lines ?? [];
    return dto;
  }
}
