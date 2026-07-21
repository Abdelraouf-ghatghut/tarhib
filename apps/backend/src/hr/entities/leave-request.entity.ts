import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LeaveRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Saisie faite par un gestionnaire RH pour le compte de l'employé — le web
 * admin est un outil interne, les employés client n'y accèdent jamais (voir
 * CLAUDE.md). */
@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ name: 'leave_type_id', type: 'uuid' })
  leaveTypeId!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'days_count', type: 'decimal', precision: 5, scale: 1 })
  daysCount!: number;

  @Column({ type: 'varchar', length: 20, default: LeaveRequestStatus.PENDING })
  status!: LeaveRequestStatus;

  @Column({ name: 'approver_id', type: 'uuid', nullable: true })
  approverId!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
