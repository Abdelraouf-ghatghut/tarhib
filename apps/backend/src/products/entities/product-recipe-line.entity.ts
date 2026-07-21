import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Ligne de nomenclature : `quantity` unités de `ingredientProductId`
 * consommées par unité vendue de `productId`. Pas de conversion d'unité —
 * la quantité doit être dans la même unité que le stock de l'ingrédient.
 */
@Entity('product_recipe_lines')
export class ProductRecipeLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'ingredient_product_id' })
  ingredientProductId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
