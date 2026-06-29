import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity.js';
import { OrderStatus } from '../orders/dto/order.dto.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { MeetingRoom } from '../meeting-rooms/entities/meeting-room.entity.js';
import {
  RoomBooking,
  BookingStatus,
} from '../meeting-rooms/entities/room-booking.entity.js';

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
  topEmployees: { employeeId: string; orderCount: number }[];
  ordersByBranch: { branchId: string; orderCount: number }[];
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
  ) {}

  async getOrdersReport(
    companyId: string,
    opts: { branchId?: string; from?: string; to?: string } = {},
  ): Promise<OrdersReport> {
    const baseQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.company_id = :companyId', { companyId });
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
    const total = await this.inventoryRepo.count({ where: { companyId } });

    const belowThresholdQb = this.inventoryRepo
      .createQueryBuilder('i')
      .where('i.company_id = :companyId', { companyId })
      .andWhere('i.quantity <= i.min_threshold');
    if (opts.branchId)
      belowThresholdQb.andWhere('i.branch_id = :branchId', {
        branchId: opts.branchId,
      });
    const belowThreshold = await belowThresholdQb.getCount();

    const outOfStockQb = this.inventoryRepo
      .createQueryBuilder('i')
      .where('i.company_id = :companyId', { companyId })
      .andWhere('i.quantity = 0');
    if (opts.branchId)
      outOfStockQb.andWhere('i.branch_id = :branchId', {
        branchId: opts.branchId,
      });
    const outOfStock = await outOfStockQb.getCount();

    return { total, belowThreshold, outOfStock };
  }

  async getSlaReport(
    companyId: string,
    opts: { from?: string; to?: string } = {},
  ): Promise<SlaReport> {
    const baseQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.company_id = :companyId', { companyId });
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

    const baseQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.company_id = :companyId', { companyId });
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

    const topEmployees = topEmployeeRows.map((r) => ({
      employeeId: r.employeeId,
      orderCount: parseInt(r.orderCount, 10),
    }));

    const branchRows = await baseQb
      .clone()
      .select('o.branch_id', 'branchId')
      .addSelect('COUNT(*)', 'orderCount')
      .groupBy('o.branch_id')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ branchId: string; orderCount: string }>();

    const ordersByBranch = branchRows.map((r) => ({
      branchId: r.branchId,
      orderCount: parseInt(r.orderCount, 10),
    }));

    return { topEmployees, ordersByBranch, total };
  }

  async getMeetingRoomsReport(
    companyId: string,
    opts: { from?: string; to?: string } = {},
  ): Promise<MeetingRoomsReport> {
    const baseQb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.company_id = :companyId', { companyId });
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
}
