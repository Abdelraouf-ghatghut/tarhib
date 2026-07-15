import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
export enum ReplenishmentStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
@Entity('inventory_replenishment_requests')
export class InventoryReplenishmentRequest {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'branch_id', type: 'uuid' }) branchId!: string;
  @Column({ name: 'product_id', type: 'uuid' }) productId!: string;
  @Column({ name: 'requested_qty', type: 'int' }) requestedQty!: number;
  @Column({ name: 'requested_by', type: 'varchar' }) requestedBy!: string;
  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy!: string | null;
  @Column({ name: 'transfer_id', type: 'uuid', nullable: true }) transferId!:
    | string
    | null;
  @Column({
    type: 'varchar',
    length: 20,
    default: ReplenishmentStatus.REQUESTED,
  })
  status!: ReplenishmentStatus;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
