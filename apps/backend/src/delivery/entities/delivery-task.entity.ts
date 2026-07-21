import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../../orders/dto/order.dto.js';

export enum DeliveryTaskStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  ISSUE_REPORTED = 'ISSUE_REPORTED',
  RETURNED = 'RETURNED',
  FAILED = 'FAILED',
}

@Entity('delivery_tasks')
export class DeliveryTask {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'order_id', type: 'uuid', unique: true }) orderId!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'branch_id', type: 'uuid' }) branchId!: string;
  @Column({ name: 'assigned_employee_id', type: 'uuid', nullable: true })
  assignedEmployeeId!: string | null;
  @Column({
    type: 'varchar',
    length: 30,
    default: DeliveryTaskStatus.AVAILABLE,
  })
  status!: DeliveryTaskStatus;
  @Column({ name: 'issue_reason', type: 'text', nullable: true }) issueReason!:
    | string
    | null;
  @Column({ name: 'issue_description', type: 'text', nullable: true })
  issueDescription!: string | null;
  @Column({
    name: 'previous_order_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  previousOrderStatus!: OrderStatus | null;
  @Column({
    name: 'previous_delivery_status',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  previousDeliveryStatus!: DeliveryTaskStatus | null;
  @Column({ name: 'picked_up_at', type: 'timestamptz', nullable: true })
  pickedUpAt!: Date | null;
  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
