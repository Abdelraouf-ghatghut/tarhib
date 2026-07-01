import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from './permission.entity.js';

export enum RoleScope {
  TARHIB = 'TARHIB',
  CLIENT = 'CLIENT',
}

export enum SlaPriority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
  P5 = 'P5',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string | null;

  @Column({ name: 'name_ar', type: 'varchar', length: 100 })
  nameAr!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100 })
  nameEn!: string;

  @Column({ type: 'varchar', length: 20 })
  scope!: RoleScope;

  @Column({ name: 'sla_priority', type: 'varchar', length: 2, default: 'P5' })
  slaPriority!: SlaPriority;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'quotas_enabled', type: 'boolean', default: false })
  quotasEnabled!: boolean;

  @ManyToMany(() => Permission, (p) => p.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_key', referencedColumnName: 'key' },
  })
  permissions!: Permission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
