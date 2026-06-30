import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity.js';

@Entity('purchase_order_lines')
export class PurchaseOrderLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId!: string;

  @ManyToOne(() => PurchaseOrder, (o) => o.lines, { onDelete: 'CASCADE' })
  order!: PurchaseOrder;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'ordered_qty', type: 'int', default: 1 })
  orderedQty!: number;

  @Column({ name: 'received_qty', type: 'int', default: 0 })
  receivedQty!: number;

  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  unitCost!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
