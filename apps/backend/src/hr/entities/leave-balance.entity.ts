import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/** Attribution annuelle simple par employé × année × type — `remaining` est
 * dérivé (entitled - taken), jamais stocké, même principe que
 * FinanceContract.isExpired. */
@Entity('leave_balances')
@Unique(['employeeId', 'leaveTypeId', 'year'])
export class LeaveBalance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ name: 'leave_type_id', type: 'uuid' })
  leaveTypeId!: string;

  @Column()
  year!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  entitled!: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  taken!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
