import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CleaningStockRequestStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
}
@Entity('cleaning_stock_requests')
export class CleaningStockRequest {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'branch_id', type: 'uuid' }) branchId!: string;
  @Column({ name: 'cleaning_product_id', type: 'uuid' })
  cleaningProductId!: string;
  @Column({ name: 'requested_qty', type: 'int' }) requestedQty!: number;
  @Column({ name: 'requested_by', type: 'varchar' }) requestedBy!: string;
  @Column({
    type: 'varchar',
    length: 20,
    default: CleaningStockRequestStatus.REQUESTED,
  })
  status!: CleaningStockRequestStatus;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
