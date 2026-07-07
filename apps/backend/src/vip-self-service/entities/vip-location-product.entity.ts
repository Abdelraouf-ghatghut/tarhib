import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VipLocation } from './vip-location.entity.js';

/** Un produit VIP et son niveau de stock au sein d'un VipLocation donné. */
@Entity('vip_location_products')
export class VipLocationProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'vip_location_id' })
  vipLocationId!: string;

  @ManyToOne(() => VipLocation, (l) => l.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vip_location_id' })
  location!: VipLocation;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ name: 'min_threshold', type: 'int', default: 0 })
  minThreshold!: number;

  @Column({ name: 'max_threshold', type: 'int', nullable: true })
  maxThreshold!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
