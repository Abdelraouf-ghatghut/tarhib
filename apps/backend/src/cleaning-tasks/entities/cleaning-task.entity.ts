import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CleaningTaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  VERIFIED = 'VERIFIED',
  CANCELLED = 'CANCELLED',
}

export enum CleaningTaskRecurrence {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

@Entity('cleaning_tasks')
export class CleaningTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'source_booking_id',
    type: 'uuid',
    nullable: true,
    unique: true,
  })
  sourceBookingId!: string | null;

  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId!: string | null;

  @Column({ name: 'scheduled_start_at', type: 'timestamptz', nullable: true })
  scheduledStartAt!: Date | null;

  @Column({ name: 'scheduled_end_at', type: 'timestamptz', nullable: true })
  scheduledEndAt!: Date | null;

  @Column({ name: 'assigned_employee_id', type: 'uuid', nullable: true })
  assignedEmployeeId!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: CleaningTaskStatus.PENDING,
  })
  status!: CleaningTaskStatus;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: CleaningTaskRecurrence.ONCE,
  })
  recurrence!: CleaningTaskRecurrence;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'verified_by_employee_id', type: 'uuid', nullable: true })
  verifiedByEmployeeId!: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
