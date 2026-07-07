import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VipLocationProduct } from './vip-location-product.entity.js';

/**
 * Lieu physique VIP (ex. "Frigo — Bureau CFO"), rattaché à une société +
 * branche, et optionnellement à un département et/ou un employé précis.
 * Un lieu peut contenir plusieurs produits (VipLocationProduct) — cf.
 * migration CreateVipLocationEntities pour l'historique du modèle
 * précédent (1 produit = 1 emplacement, fusionné dans inventory_items).
 */
@Entity('vip_locations')
export class VipLocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'branch_id' })
  branchId!: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId!: string | null;

  @Column({ name: 'assigned_employee_id', type: 'uuid', nullable: true })
  assignedEmployeeId!: string | null;

  @Column({ name: 'location_name', type: 'varchar', nullable: true })
  locationName!: string | null;

  @OneToMany(() => VipLocationProduct, (p) => p.location, { cascade: true })
  products!: VipLocationProduct[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
