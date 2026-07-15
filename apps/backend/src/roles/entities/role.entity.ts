import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from './permission.entity.js';
import { RoleQuota } from './role-quota.entity.js';
import { MeetingRoom } from '../../meeting-rooms/entities/meeting-room.entity.js';

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

  // Optionnel : l'arabe est la langue de référence, l'anglais un complément
  @Column({ name: 'name_en', type: 'varchar', length: 100, nullable: true })
  nameEn!: string | null;

  @Column({ type: 'varchar', length: 20 })
  scope!: RoleScope;

  // Code libre référençant un niveau SLA de l'entreprise (défauts : P1..P5)
  @Column({ name: 'sla_priority', type: 'varchar', length: 20, default: 'P5' })
  slaPriority!: string;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'quotas_enabled', type: 'boolean', default: false })
  quotasEnabled!: boolean;

  /**
   * Accès aux salles de réunion (rôles CLIENT avec meeting.book) :
   * true = toutes les salles de la société ; false = seulement allowedRooms.
   */
  @Column({ name: 'all_rooms_allowed', type: 'boolean', default: true })
  allRoomsAllowed!: boolean;

  @ManyToMany(() => MeetingRoom)
  @JoinTable({
    name: 'role_meeting_rooms',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'room_id', referencedColumnName: 'id' },
  })
  allowedRooms!: MeetingRoom[];

  @ManyToMany(() => Permission, (p) => p.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_key', referencedColumnName: 'key' },
  })
  permissions!: Permission[];

  @OneToMany(() => RoleQuota, (q) => q.role)
  quotas!: RoleQuota[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
