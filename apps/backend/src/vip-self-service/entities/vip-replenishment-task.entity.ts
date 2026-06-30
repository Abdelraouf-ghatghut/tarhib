import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum VipTaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity('vip_replenishment_tasks')
export class VipReplenishmentTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'inventory_item_id' })
  inventoryItemId!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'location_name', type: 'varchar', nullable: true })
  locationName!: string | null;

  @Column({ name: 'requested_qty', type: 'int', default: 0 })
  requestedQty!: number;

  @Column({ type: 'varchar', length: 20, default: VipTaskStatus.OPEN })
  status!: VipTaskStatus;

  @Column({ name: 'assigned_agent_id', type: 'varchar', nullable: true })
  assignedAgentId!: string | null;

  @Column({ name: 'completed_by', type: 'varchar', nullable: true })
  completedBy!: string | null;

  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
