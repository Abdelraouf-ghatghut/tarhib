import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderLine } from './order-line.entity.js';
import { OrderStatus } from '../dto/order.dto.js';

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

  // Code du niveau SLA (défauts P1..P5 ou code personnalisé de l'entreprise)
  @Column({ type: 'varchar', length: 20 })
  priority!: string;

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
