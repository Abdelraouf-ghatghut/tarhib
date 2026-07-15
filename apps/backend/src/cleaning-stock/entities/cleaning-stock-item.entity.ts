import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cleaning_stock_items')
export class CleaningStockItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'cleaning_product_id', type: 'uuid' })
  cleaningProductId!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ name: 'min_threshold', type: 'int', default: 0 })
  minThreshold!: number;

  @Column({ name: 'max_threshold', type: 'int', nullable: true })
  maxThreshold!: number | null;

  @Column({ name: 'location_name', type: 'varchar', nullable: true })
  locationName!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
