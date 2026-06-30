import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'user_email', nullable: true })
  userEmail!: string | null;

  @Column({ length: 100 })
  action!: string;

  @Column({ length: 100 })
  entity!: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
