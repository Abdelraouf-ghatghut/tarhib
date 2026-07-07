import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockZone } from '../../inventory/entities/inventory-item.entity.js';

export enum TransferStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('inventory_transfers')
export class InventoryTransfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'from_zone', type: 'varchar', length: 20 })
  fromZone!: StockZone;

  @Column({ name: 'to_zone', type: 'varchar', length: 20 })
  toZone!: StockZone;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'varchar', length: 20, default: TransferStatus.PENDING })
  status!: TransferStatus;

  @Column({ name: 'requested_by' })
  requestedBy!: string;

  @Column({ name: 'confirmed_by', type: 'varchar', nullable: true })
  confirmedBy!: string | null;

  @Column({ nullable: true, type: 'text' })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'confirmed_at', nullable: true, type: 'timestamptz' })
  confirmedAt!: Date | null;

  @Column({ name: 'cancelled_by', type: 'varchar', nullable: true })
  cancelledBy!: string | null;

  @Column({ name: 'cancelled_at', nullable: true, type: 'timestamptz' })
  cancelledAt!: Date | null;
}
