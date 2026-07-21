import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Dette de Tarhib envers un tiers. Pas de colonne statut : PENDING /
 * PARTIALLY_PAID / PAID / OVERDUE sont dérivés de remainingAmount/dueDate
 * (voir FinanceService.debtStatus) pour n'avoir qu'une seule source de
 * vérité et éviter un job de rafraîchissement du statut.
 */
@Entity('finance_debts')
export class FinanceDebt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'creditor_name' })
  creditorName!: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({
    name: 'remaining_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  remainingAmount!: number;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
