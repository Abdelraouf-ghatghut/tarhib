import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Role } from './role.entity.js';

export enum QuotaPeriodType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

@Entity('role_quotas')
@Unique(['roleId', 'productId', 'periodType'])
export class RoleQuota {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'role_id' })
  roleId!: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'period_type', type: 'varchar', length: 20 })
  periodType!: QuotaPeriodType;

  @Column({ name: 'max_quantity', type: 'int' })
  maxQuantity!: number;
}
