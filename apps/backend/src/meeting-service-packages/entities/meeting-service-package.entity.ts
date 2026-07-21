import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ServicePackageType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  CUSTOM = 'CUSTOM',
}

@Entity('meeting_service_packages')
export class MeetingServicePackage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'name_ar' })
  nameAr!: string;

  @Column({ name: 'name_en', type: 'varchar', nullable: true })
  nameEn!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ServicePackageType.CUSTOM,
  })
  type!: ServicePackageType;

  /** Included items description (bilingual JSON) */
  @Column({ type: 'jsonb', nullable: true })
  descriptionAr!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  descriptionEn!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
