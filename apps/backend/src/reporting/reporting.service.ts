import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity.js';
import { OrderStatus } from '../orders/dto/order.dto.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';

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

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
  ) {}

  /**
   * Rapport commandes : total, répartition par statut et par priorité.
   * TARHIB-10
   */
  async getOrdersReport(companyId: string): Promise<OrdersReport> {
    const statusRows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.company_id = :companyId', { companyId })
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of statusRows) {
      const cnt = parseInt(row.count, 10);
      byStatus[row.status] = cnt;
      total += cnt;
    }

    const priorityRows = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('o.company_id = :companyId', { companyId })
      .groupBy('o.priority')
      .getRawMany<{ priority: string; count: string }>();

    const byPriority: Record<string, number> = {};
    for (const row of priorityRows) {
      byPriority[row.priority] = parseInt(row.count, 10);
    }

    return { total, byStatus, byPriority };
  }

  /**
   * Rapport stock : total articles, articles sous seuil, ruptures.
   * TARHIB-10
   */
  async getInventoryReport(companyId: string): Promise<InventoryReport> {
    const total = await this.inventoryRepo.count({ where: { companyId } });

    const belowThreshold = await this.inventoryRepo
      .createQueryBuilder('i')
      .where('i.company_id = :companyId', { companyId })
      .andWhere('i.quantity <= i.min_threshold')
      .getCount();

    const outOfStock = await this.inventoryRepo
      .createQueryBuilder('i')
      .where('i.company_id = :companyId', { companyId })
      .andWhere('i.quantity = 0')
      .getCount();

    return { total, belowThreshold, outOfStock };
  }

  /**
   * Rapport SLA simplifié.
   * Commandes DELIVERED = dans les délais (on time).
   * Commandes non-livrées avec sla_deadline dépassé = en retard (late).
   * TARHIB-10
   */
  async getSlaReport(companyId: string): Promise<SlaReport> {
    const total = await this.orderRepo.count({ where: { companyId } });

    const onTime = await this.orderRepo.count({
      where: { companyId, status: OrderStatus.DELIVERED },
    });

    const late = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.company_id = :companyId', { companyId })
      .andWhere('o.status != :status', { status: OrderStatus.DELIVERED })
      .andWhere('o.sla_deadline < NOW()')
      .getCount();

    const complianceRate = total > 0 ? Math.round((onTime / total) * 100) : 100;

    return { total, onTime, late, complianceRate };
  }
}
