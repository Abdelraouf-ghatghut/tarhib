import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderLine } from './order-line.entity.js';
import { OrderPriority, OrderStatus } from '../dto/order.dto.js';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id' })
  employeeId!: string;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 2 })
  priority!: OrderPriority;

  @Column({ name: 'sla_deadline', type: 'timestamptz' })
  slaDeadline!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => OrderLine, (line) => line.order, {
    cascade: true,
    eager: true,
  })
  lines!: OrderLine[];
}
