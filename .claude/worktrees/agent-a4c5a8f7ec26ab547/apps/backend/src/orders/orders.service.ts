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
import { Employee } from '../employees/entities/employee.entity.js';

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
    private readonly validationEngine: ValidationEngineService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateOrderDto, caller: JwtPayload): Promise<OrderDto> {
    // Build ValidationContext — in prod, inject ProductsService/InventoryService/QuotasService
    // For now the engine receives empty snapshots: all validation passes by default
    // (cross-module data loading will be wired once ORG+Products branches are merged to main)
    const ctx: ValidationContext = {
      employeeId: caller.sub,
      companyId: caller.companyId,
      branchId: caller.branchId,
      role: caller.role,
      products: [],
      stocks: [],
      quotas: [],
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
