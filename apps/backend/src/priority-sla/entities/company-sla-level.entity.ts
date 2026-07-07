import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Niveaux de priorité personnalisés par entreprise : nombre illimité,
 * code libre (ex. P1, VIP, URGENT), libellés bilingues, durée cible en
 * minutes, activation et ordre d'affichage. Chaque entreprise démarre avec
 * 3 niveaux par défaut (P1/P2/P3, voir DEFAULT_SLA_LEVELS) qu'elle peut
 * ensuite modifier, compléter ou remplacer intégralement.
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
