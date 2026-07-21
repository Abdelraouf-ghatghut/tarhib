import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FinanceAccountType {
  BANK = 'BANK',
  CASH = 'CASH',
}

/** Compte bancaire/caisse de Tarhib. Solde saisi directement (constaté) —
 * pas de ledger de mouvements en v1, voir plan Finance pour l'extension. */
@Entity('finance_accounts')
export class FinanceAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: FinanceAccountType.BANK,
  })
  type!: FinanceAccountType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
