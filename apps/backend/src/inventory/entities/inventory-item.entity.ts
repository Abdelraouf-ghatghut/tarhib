import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ name: 'min_threshold', type: 'int', default: 0 })
  minThreshold!: number;

  @Column({ name: 'max_threshold', type: 'int', nullable: true })
  maxThreshold!: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
