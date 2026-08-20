import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CompanyRegistrationMode {
  CLOSED = 'CLOSED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  AUTO_APPROVED = 'AUTO_APPROVED',
  INVITE_ONLY = 'INVITE_ONLY',
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nom canonique interne (unique) — dérivé de nameEn, sert au tri et à l'unicité */
  @Column({ unique: true })
  name!: string;

  @Column({ name: 'name_ar', type: 'varchar', length: 200 })
  nameAr!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 200, nullable: true })
  nameEn!: string | null;

  @Column({ unique: true })
  slug!: string;

  @Column({ default: true })
  active!: boolean;

  @Column({
    name: 'registration_mode',
    type: 'varchar',
    length: 30,
    default: CompanyRegistrationMode.CLOSED,
  })
  registrationMode!: CompanyRegistrationMode;

  @Column({ name: 'registration_code_hash', type: 'varchar', nullable: true })
  registrationCodeHash!: string | null;

  @Column({
    name: 'registration_code_rotated_at',
    type: 'timestamptz',
    nullable: true,
  })
  registrationCodeRotatedAt!: Date | null;

  @Column({
    name: 'registration_code_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  registrationCodeExpiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
