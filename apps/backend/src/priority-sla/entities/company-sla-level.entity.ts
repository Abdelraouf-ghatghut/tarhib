import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SlaPriority } from '../../roles/entities/role.entity.js';

/**
 * Personnalisation par entreprise des 5 niveaux de priorité SLA (P1..P5) :
 * libellés bilingues, durée cible en minutes et activation par niveau.
 * En l'absence de configuration, les défauts globaux s'appliquent.
 */
@Entity('company_sla_levels')
@Unique(['companyId', 'code'])
export class CompanySlaLevel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 2 })
  code!: SlaPriority;

  @Column({ name: 'name_ar', type: 'varchar', length: 100, nullable: true })
  nameAr!: string | null;

  @Column({ name: 'name_en', type: 'varchar', length: 100, nullable: true })
  nameEn!: string | null;

  @Column({ name: 'target_minutes', type: 'int' })
  targetMinutes!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
