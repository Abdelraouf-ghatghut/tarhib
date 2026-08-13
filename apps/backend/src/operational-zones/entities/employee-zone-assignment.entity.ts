import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('employee_zone_assignments')
export class EmployeeZoneAssignment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'zone_id', type: 'uuid' }) zoneId!: string;
  @Column({ name: 'employee_id', type: 'uuid' }) employeeId!: string;
  @Column({ name: 'starts_at', type: 'timestamptz' }) startsAt!: Date;
  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt!: Date | null;
  @Column({ default: true }) active!: boolean;
  @Column({ name: 'assigned_by', type: 'varchar', length: 120 })
  assignedBy!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
