import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductType } from '../dto/product.dto.js';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name_ar' })
  nameAr!: string;

  @Column({ name: 'name_en' })
  nameEn!: string;

  @Column({ length: 100 })
  category!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: ProductType;

  @Column({ name: 'allowed_roles', type: 'simple-array', nullable: true })
  allowedRoles!: string[] | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl!: string | null;

  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  unitCost!: number | null;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
