import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quotas')
export class Quota {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id' })
  employeeId!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ name: 'max_quantity', type: 'int' })
  maxQuantity!: number;

  @Column({ name: 'used_quantity', type: 'int', default: 0 })
  usedQuantity!: number;
}
