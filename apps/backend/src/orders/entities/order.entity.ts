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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /**
   * Horodatage + acteur (identité Keycloak de l'appelant, pas employees.id)
   * de chaque étape de préparation/livraison — alimente les temps moyens et
   * le rapport de performance agents.
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt!: Date | null;

  @Column({ name: 'rejected_by', type: 'uuid', nullable: true })
  rejectedBy!: string | null;

  @Column({ name: 'prep_started_at', type: 'timestamptz', nullable: true })
  prepStartedAt!: Date | null;

  @Column({ name: 'prepared_by', type: 'uuid', nullable: true })
  preparedBy!: string | null;

  @Column({ name: 'ready_at', type: 'timestamptz', nullable: true })
  readyAt!: Date | null;

  @Column({ name: 'ready_by', type: 'uuid', nullable: true })
  readyBy!: string | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'delivered_by', type: 'uuid', nullable: true })
  deliveredBy!: string | null;

  @OneToMany(() => OrderLine, (line) => line.order, {
    cascade: true,
    eager: true,
  })
  lines!: OrderLine[];
}
