import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { OrderDto, OrderStatus } from '../orders/dto/order.dto.js';
import { OrdersService } from '../orders/orders.service.js';
import {
  DeliveryTask,
  DeliveryTaskStatus,
} from './entities/delivery-task.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export interface DeliveryTaskDto extends DeliveryTask {
  order: OrderDto;
  destination: {
    recipientNameAr: string;
    recipientNameEn: string;
    floor: string | null;
    officeNumber: string | null;
    companyNameAr: string;
    companyNameEn: string;
    branchNameAr: string;
    branchNameEn: string;
  } | null;
}

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryTask)
    private readonly repo: Repository<DeliveryTask>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    private readonly notifications: NotificationsService,
    private readonly orders: OrdersService,
  ) {}

  async queue(
    companyId?: string,
    branchId?: string,
  ): Promise<DeliveryTaskDto[]> {
    const ready = (
      await this.orders.findAll(companyId, undefined, OrderStatus.READY)
    ).filter((o) => !branchId || o.branchId === branchId);
    for (const order of ready) {
      const existing = await this.repo.findOne({
        where: { orderId: order.id },
      });
      if (!existing)
        await this.repo.save(
          this.repo.create({
            orderId: order.id,
            companyId: order.companyId,
            branchId: order.branchId,
            assignedEmployeeId: null,
            status: DeliveryTaskStatus.AVAILABLE,
            issueReason: null,
            pickedUpAt: null,
            deliveredAt: null,
          }),
        );
    }
    const tasks = await this.repo.find({
      where: branchId ? { branchId } : companyId ? { companyId } : {},
      order: { createdAt: 'ASC' },
    });
    const orderMap = new Map(ready.map((order) => [order.id, order]));
    const visible = tasks.filter(
      (task) =>
        orderMap.has(task.orderId) &&
        ![
          DeliveryTaskStatus.DELIVERED,
          DeliveryTaskStatus.FAILED,
          DeliveryTaskStatus.RETURNED,
        ].includes(task.status),
    );
    const employeeIds = [
      ...new Set(visible.map((task) => orderMap.get(task.orderId)!.employeeId)),
    ];
    const companyIds = [...new Set(visible.map((task) => task.companyId))];
    const branchIds = [...new Set(visible.map((task) => task.branchId))];
    const [employees, companies, branches]: [Employee[], Company[], Branch[]] =
      await Promise.all([
        employeeIds.length
          ? this.employeeRepo.findBy(employeeIds.map((id) => ({ id })))
          : [],
        companyIds.length
          ? this.companyRepo.findBy(companyIds.map((id) => ({ id })))
          : [],
        branchIds.length
          ? this.branchRepo.findBy(branchIds.map((id) => ({ id })))
          : [],
      ]);
    const employeeMap = new Map<string, Employee>(
      employees.map((employee) => [employee.id, employee]),
    );
    const companyMap = new Map<string, Company>(
      companies.map((company) => [company.id, company]),
    );
    const branchMap = new Map<string, Branch>(
      branches.map((branch) => [branch.id, branch]),
    );
    return visible.map((task) => {
      const order = orderMap.get(task.orderId)!;
      const employee = employeeMap.get(order.employeeId);
      const company = companyMap.get(task.companyId);
      const branch = branchMap.get(task.branchId);
      const destination =
        employee && company && branch
          ? {
              recipientNameAr: `${employee.firstNameAr} ${employee.lastNameAr}`,
              recipientNameEn: `${employee.firstNameEn} ${employee.lastNameEn}`,
              floor: employee.floor,
              officeNumber: employee.officeNumber,
              companyNameAr: company.nameAr,
              companyNameEn: company.nameEn,
              branchNameAr: branch.nameAr,
              branchNameEn: branch.nameEn,
            }
          : null;
      return Object.assign(task, { order, destination });
    });
  }

  async findOne(id: string): Promise<DeliveryTask> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Delivery task ${id} not found`);
    return task;
  }

  async transitionAtomic(
    id: string,
    status: DeliveryTaskStatus,
    user: JwtPayload,
    reason?: string,
  ): Promise<DeliveryTask> {
    const task = await this.repo.manager.transaction(async (manager) => {
      const tasks = manager.getRepository(DeliveryTask);
      const current = await tasks.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current)
        throw new NotFoundException(`Delivery task ${id} not found`);
      const employeeId = user.employeeId ?? user.sub;
      if (status === DeliveryTaskStatus.ASSIGNED) {
        if (
          current.status === DeliveryTaskStatus.ASSIGNED &&
          current.assignedEmployeeId === employeeId
        )
          return current;
        if (current.status !== DeliveryTaskStatus.AVAILABLE)
          throw new BadRequestException('deliveryTaskNotAvailable');
        current.assignedEmployeeId = employeeId;
      } else if (
        current.assignedEmployeeId !== employeeId &&
        !user.permissions.includes('order.queue.manage')
      )
        throw new ForbiddenException('deliveryAssignedToAnotherEmployee');
      const allowed: Record<DeliveryTaskStatus, DeliveryTaskStatus[]> = {
        AVAILABLE: [DeliveryTaskStatus.ASSIGNED],
        ASSIGNED: [DeliveryTaskStatus.PICKED_UP, DeliveryTaskStatus.AVAILABLE],
        PICKED_UP: [
          DeliveryTaskStatus.OUT_FOR_DELIVERY,
          DeliveryTaskStatus.ISSUE_REPORTED,
        ],
        OUT_FOR_DELIVERY: [
          DeliveryTaskStatus.DELIVERED,
          DeliveryTaskStatus.ISSUE_REPORTED,
        ],
        ISSUE_REPORTED: [
          DeliveryTaskStatus.OUT_FOR_DELIVERY,
          DeliveryTaskStatus.RETURNED,
          DeliveryTaskStatus.FAILED,
        ],
        DELIVERED: [],
        RETURNED: [],
        FAILED: [],
      };
      if (!allowed[current.status].includes(status))
        throw new BadRequestException(
          `invalidDeliveryTransition:${current.status}:${status}`,
        );
      current.status = status;
      if (status === DeliveryTaskStatus.PICKED_UP)
        current.pickedUpAt = new Date();
      if (status === DeliveryTaskStatus.ISSUE_REPORTED)
        current.issueReason = reason?.trim() || 'Unspecified issue';
      if (status === DeliveryTaskStatus.DELIVERED)
        current.deliveredAt = new Date();
      return tasks.save(current);
    });
    if (status === DeliveryTaskStatus.DELIVERED)
      await this.orders.updateStatus(task.orderId, OrderStatus.DELIVERED, user);
    if (status === DeliveryTaskStatus.ISSUE_REPORTED)
      await this.notifications.notifyByPermission(
        'order.queue.manage',
        { companyId: task.companyId, branchId: task.branchId },
        {
          domain: 'delivery',
          titleAr: 'مشكلة في التوصيل',
          titleEn: 'Delivery issue',
          bodyAr: task.issueReason!,
          bodyEn: task.issueReason!,
          referenceId: task.id,
          data: { deliveryTaskId: task.id, orderId: task.orderId },
        },
      );
    return task;
  }

  async transition(
    id: string,
    status: DeliveryTaskStatus,
    user: JwtPayload,
    reason?: string,
  ): Promise<DeliveryTask> {
    const task = await this.findOne(id);
    const employeeId = user.employeeId ?? user.sub;
    if (status === DeliveryTaskStatus.ASSIGNED) {
      if (task.status !== DeliveryTaskStatus.AVAILABLE)
        throw new BadRequestException('Delivery task is not available');
      task.assignedEmployeeId = employeeId;
    } else if (
      task.assignedEmployeeId !== employeeId &&
      !user.permissions.includes('order.queue.manage')
    ) {
      throw new ForbiddenException(
        'Delivery task is assigned to another employee',
      );
    }
    const allowed: Record<DeliveryTaskStatus, DeliveryTaskStatus[]> = {
      AVAILABLE: [DeliveryTaskStatus.ASSIGNED],
      ASSIGNED: [DeliveryTaskStatus.PICKED_UP, DeliveryTaskStatus.AVAILABLE],
      PICKED_UP: [
        DeliveryTaskStatus.OUT_FOR_DELIVERY,
        DeliveryTaskStatus.ISSUE_REPORTED,
      ],
      OUT_FOR_DELIVERY: [
        DeliveryTaskStatus.DELIVERED,
        DeliveryTaskStatus.ISSUE_REPORTED,
      ],
      ISSUE_REPORTED: [
        DeliveryTaskStatus.OUT_FOR_DELIVERY,
        DeliveryTaskStatus.RETURNED,
        DeliveryTaskStatus.FAILED,
      ],
      DELIVERED: [],
      RETURNED: [],
      FAILED: [],
    };
    if (!allowed[task.status].includes(status))
      throw new BadRequestException(
        `Invalid delivery transition ${task.status} -> ${status}`,
      );
    task.status = status;
    if (status === DeliveryTaskStatus.PICKED_UP) task.pickedUpAt = new Date();
    if (status === DeliveryTaskStatus.ISSUE_REPORTED)
      task.issueReason = reason?.trim() || 'Unspecified issue';
    if (status === DeliveryTaskStatus.ISSUE_REPORTED) {
      await this.notifications.notifyByPermission(
        'order.queue.manage',
        { companyId: task.companyId, branchId: task.branchId },
        {
          domain: 'delivery',
          titleAr: 'مشكلة في التوصيل',
          titleEn: 'Delivery issue',
          bodyAr: task.issueReason!,
          bodyEn: task.issueReason!,
          referenceId: task.id,
          data: { deliveryTaskId: task.id, orderId: task.orderId },
        },
      );
    }
    if (status === DeliveryTaskStatus.DELIVERED) {
      task.deliveredAt = new Date();
      await this.orders.updateStatus(task.orderId, OrderStatus.DELIVERED, user);
    }
    return this.repo.save(task);
  }
}
