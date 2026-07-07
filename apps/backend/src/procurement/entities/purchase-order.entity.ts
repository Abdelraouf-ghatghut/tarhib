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
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATED = 'VALIDATED',
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

  /**
   * Chaîne de validation des achats : le responsable stock crée (DRAFT), la
   * soumet (PENDING_VALIDATION) à un validateur, qui approuve (VALIDATED) —
   * transmis alors au responsable achats pour achat + livraison (SENT).
   */
  @Column({ name: 'validated_by', type: 'uuid', nullable: true })
  validatedBy!: string | null;

  @Column({ name: 'validated_at', nullable: true, type: 'timestamptz' })
  validatedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'rejected_by', type: 'varchar', nullable: true })
  rejectedBy!: string | null;

  @Column({ name: 'rejected_at', nullable: true, type: 'timestamptz' })
  rejectedAt!: Date | null;

  @Column({ name: 'sent_by', type: 'varchar', nullable: true })
  sentBy!: string | null;

  @Column({ name: 'sent_at', nullable: true, type: 'timestamptz' })
  sentAt!: Date | null;

  @Column({ name: 'received_by', type: 'varchar', nullable: true })
  receivedBy!: string | null;

  @Column({ name: 'received_at', nullable: true, type: 'timestamptz' })
  receivedAt!: Date | null;

  @Column({ name: 'cancelled_by', type: 'varchar', nullable: true })
  cancelledBy!: string | null;

  @Column({ name: 'cancelled_at', nullable: true, type: 'timestamptz' })
  cancelledAt!: Date | null;

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
