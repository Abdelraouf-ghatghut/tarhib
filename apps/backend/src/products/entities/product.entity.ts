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

  // Optionnel : l'arabe est la langue de référence, l'anglais un complément
  @Column({ name: 'name_en', type: 'varchar', nullable: true })
  nameEn!: string | null;

  @Column({ length: 100 })
  category!: string;

  /** @deprecated remplacé par isSold/isPurchased/isVipSelfService — conservé le temps de la transition */
  @Column({ type: 'varchar', length: 50 })
  type!: ProductType;

  @Column({ name: 'is_purchased', default: true })
  isPurchased!: boolean;

  @Column({ name: 'is_sold', default: false })
  isSold!: boolean;

  @Column({ name: 'is_vip_self_service', default: false })
  isVipSelfService!: boolean;

  /**
   * Unité de stock/recette ("g", "ml", "unité") — c'est l'unité dans
   * laquelle le stock est compté et dans laquelle une ligne de recette
   * exprime sa quantité.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  unit!: string | null;

  /** Unité d'achat fournisseur, si différente de `unit` (ex. "sac", "carton"). */
  @Column({
    name: 'purchase_unit',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  purchaseUnit!: string | null;

  /**
   * Combien d'unités de stock (`unit`) contient une unité d'achat
   * (`purchaseUnit`) — ex. 1 sac = 1000g → unitsPerPurchase = 1000. Défaut 1
   * = aucune conversion (orderedQty/receivedQty déjà en unité de stock).
   */
  @Column({ name: 'units_per_purchase', type: 'int', default: 1 })
  unitsPerPurchase!: number;

  @Column({ name: 'allowed_roles', type: 'simple-array', nullable: true })
  allowedRoles!: string[] | null;

  /**
   * Branches où ce produit est commandable — null/vide = aucune restriction
   * (commandable dans toutes les branches), même convention que allowedRoles.
   */
  @Column({ name: 'allowed_branches', type: 'simple-array', nullable: true })
  allowedBranches!: string[] | null;

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
