import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchaseOrderLine } from './purchase-order-line.entity.js';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @Column({ name: 'supplier_id' })
  supplierId!: string;

  @Column({ type: 'varchar', length: 30, default: PurchaseOrderStatus.DRAFT })
  status!: PurchaseOrderStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by' })
  createdBy!: string;

  @OneToMany(() => PurchaseOrderLine, (l) => l.order, {
    cascade: true,
    eager: true,
  })
  lines!: PurchaseOrderLine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
