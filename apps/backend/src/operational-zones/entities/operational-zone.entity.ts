import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OperationalZoneType {
  DELIVERY = 'DELIVERY',
  CLEANING = 'CLEANING',
}

@Entity('operational_zones')
export class OperationalZone {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'branch_id', type: 'uuid' }) branchId!: string;
  @Column({ type: 'varchar', length: 20 }) type!: OperationalZoneType;
  @Column({ name: 'name_ar', type: 'varchar', length: 120 }) nameAr!: string;
  @Column({ name: 'name_en', type: 'varchar', length: 120, nullable: true })
  nameEn!: string | null;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) floors!: string[];
  @Column({ default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
