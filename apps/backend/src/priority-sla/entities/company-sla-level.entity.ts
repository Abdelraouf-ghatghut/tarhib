import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Niveaux de priorité SLA personnalisés par entreprise : nombre illimité,
 * code libre (ex. P1, VIP, URGENT), libellés bilingues, durée cible en
 * minutes, activation et ordre d'affichage. En l'absence de configuration,
 * les 5 défauts globaux (P1..P5) s'appliquent.
 */
@Entity('company_sla_levels')
@Unique(['companyId', 'code'])
export class CompanySlaLevel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ name: 'name_ar', type: 'varchar', length: 100, nullable: true })
  nameAr!: string | null;

  @Column({ name: 'name_en', type: 'varchar', length: 100, nullable: true })
  nameEn!: string | null;

  @Column({ name: 'target_minutes', type: 'int' })
  targetMinutes!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
