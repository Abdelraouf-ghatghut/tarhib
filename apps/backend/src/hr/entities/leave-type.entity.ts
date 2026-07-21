import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name_ar' })
  nameAr!: string;

  @Column({ name: 'name_en' })
  nameEn!: string;

  /** Attribution annuelle simple (pas d'acquisition mensuelle au prorata) —
   * sert de valeur par défaut à la création d'un LeaveBalance. */
  @Column({
    name: 'default_days_per_year',
    type: 'decimal',
    precision: 5,
    scale: 1,
  })
  defaultDaysPerYear!: number;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
