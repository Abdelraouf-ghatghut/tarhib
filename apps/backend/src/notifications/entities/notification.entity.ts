import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'employee_id', type: 'uuid' }) employeeId!: string;
  @Column({ type: 'varchar', length: 40 }) domain!: string;
  @Column({ name: 'title_ar', type: 'varchar' }) titleAr!: string;
  @Column({ name: 'title_en', type: 'varchar' }) titleEn!: string;
  @Column({ name: 'body_ar', type: 'text' }) bodyAr!: string;
  @Column({ name: 'body_en', type: 'text' }) bodyEn!: string;
  @Column({ name: 'reference_id', type: 'varchar', nullable: true })
  referenceId!: string | null;
  @Column({ type: 'jsonb', nullable: true }) data!: Record<
    string,
    string
  > | null;
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
