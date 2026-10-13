import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity.js';

export enum LineValidationStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

@Entity('order_lines')
export class OrderLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    name: 'validation_status',
    type: 'varchar',
    length: 20,
    default: LineValidationStatus.APPROVED,
  })
  validationStatus!: LineValidationStatus;

  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  rejectionReason!: string | null;
}
