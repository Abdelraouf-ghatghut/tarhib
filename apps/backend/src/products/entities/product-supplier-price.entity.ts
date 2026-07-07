import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Prix d'achat d'un produit chez un fournisseur donné. Permet, lors de la
 * création d'un bon de commande (المشتريات), de pré-remplir automatiquement
 * le coût unitaire dès que le fournisseur et le produit de la ligne sont
 * choisis, au lieu de le ressaisir à chaque fois.
 */
@Entity('product_supplier_prices')
@Unique(['productId', 'supplierId'])
export class ProductSupplierPrice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 2 })
  unitCost!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
