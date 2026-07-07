import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StockZone {
  CENTRAL = 'CENTRAL',
  BRANCH = 'BRANCH',
  KITCHEN = 'KITCHEN',
}

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

  @Column({
    type: 'varchar',
    length: 20,
    default: StockZone.BRANCH,
  })
  zone!: StockZone;

  @Column({ type: 'int', default: 0 })
  quantity!: number;

  @Column({ name: 'min_threshold', type: 'int', default: 0 })
  minThreshold!: number;

  @Column({ name: 'max_threshold', type: 'int', nullable: true })
  maxThreshold!: number | null;

  @Column({ name: 'location_name', type: 'varchar', nullable: true })
  locationName!: string | null;

  /**
   * Emplacements VIP uniquement (produit LIBRE_SERVICE_VIP) : rattachement
   * optionnel à un département et/ou à un employé précis — un employé VIP a
   * son propre emplacement (ex. frigo personnel), distinct du stock de
   * branche partagé. Sans effet sur les items non-VIP (toujours null).
   */
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId!: string | null;

  @Column({ name: 'assigned_employee_id', type: 'uuid', nullable: true })
  assignedEmployeeId!: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
