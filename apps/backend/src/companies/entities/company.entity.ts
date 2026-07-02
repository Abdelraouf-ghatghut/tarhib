import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nom canonique interne (unique) — dérivé de nameEn, sert au tri et à l'unicité */
  @Column({ unique: true })
  name!: string;

  @Column({ name: 'name_ar', type: 'varchar', length: 200 })
  nameAr!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 200 })
  nameEn!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
