import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'name_ar' })
  nameAr!: string;

  // Optionnel : l'arabe est la langue de référence, l'anglais un complément
  @Column({ name: 'name_en', type: 'varchar', nullable: true })
  nameEn!: string | null;

  @Column({ default: true })
  active!: boolean;

  /**
   * Chaîne de validation des achats pour cette branche (personnel Tarhib
   * dispatché, pas des employés clients) : responsable stock (crée la
   * demande d'achat), validateur (l'approuve), responsable achats (achète
   * et livre). Tous optionnels — aucune notification si le rôle est vide.
   */
  @Column({ name: 'stock_responsible_id', type: 'uuid', nullable: true })
  stockResponsibleId!: string | null;

  @Column({ name: 'order_validator_id', type: 'uuid', nullable: true })
  orderValidatorId!: string | null;

  @Column({ name: 'purchasing_manager_id', type: 'uuid', nullable: true })
  purchasingManagerId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
