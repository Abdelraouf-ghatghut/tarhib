import { Column, Entity, ManyToMany, PrimaryColumn } from 'typeorm';
import { Role } from './role.entity.js';

export enum PermissionScope {
  TARHIB = 'TARHIB',
  CLIENT = 'CLIENT',
  ALL = 'ALL',
}

@Entity('permissions')
export class Permission {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ name: 'name_ar', type: 'varchar', length: 200 })
  nameAr!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 200 })
  nameEn!: string;

  @Column({ type: 'varchar', length: 20 })
  scope!: PermissionScope;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
