import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import {
  ContractBillingFrequency,
  ContractStatus,
} from '../entities/finance-contract.entity.js';
import { ExpenseCategory } from '../entities/finance-expense.entity.js';
import { FinanceAccountType } from '../entities/finance-account.entity.js';
import { FinancePeriodStatus } from '../entities/finance-period.entity.js';

// ---- Contracts ----

export class CreateFinanceContractDto {
  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  label!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ enum: ContractBillingFrequency })
  @IsEnum(ContractBillingFrequency)
  billingFrequency!: ContractBillingFrequency;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateFinanceContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ enum: ContractBillingFrequency })
  @IsOptional()
  @IsEnum(ContractBillingFrequency)
  billingFrequency?: ContractBillingFrequency;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class FinanceContractDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() label!: string;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty() amount!: number;
  @ApiProperty({ enum: ContractBillingFrequency })
  billingFrequency!: ContractBillingFrequency;
  @ApiProperty({ enum: ContractStatus }) status!: ContractStatus;
  @ApiProperty({
    description: "Dérivé de endDate < aujourd'hui, jamais stocké",
  })
  isExpired!: boolean;
  @ApiProperty({ nullable: true }) notes!: string | null;
}

// ---- Expenses ----

export class CreateFinanceExpenseDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  label!: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  expenseDate!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      "N'a de sens que pour category=SALARIES — requis dans ce cas, ignoré sinon",
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-07',
    description:
      "Mois de paie 'YYYY-MM' — n'a de sens que pour category=SALARIES avec employeeId ; par défaut le mois en cours si omis",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  payrollPeriod?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    default: true,
    description:
      'Payée immédiatement (crédite Banque en comptabilité générale) ou encore due (crédite Fournisseurs/Personnel à payer)',
  })
  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}

export class UpdateFinanceExpenseDto {
  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  employeeId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-07' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  payrollPeriod?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}

export class FinanceExpenseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ExpenseCategory }) category!: ExpenseCategory;
  @ApiProperty() label!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() expenseDate!: string;
  @ApiProperty({ nullable: true }) companyId!: string | null;
  @ApiProperty({ nullable: true }) employeeId!: string | null;
  @ApiProperty({ nullable: true }) payrollPeriod!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty() paid!: boolean;
  @ApiProperty({
    nullable: true,
    description:
      "Renseigné sur les lignes de contre-passation/remplacement d'une correction — pointe vers la ligne d'origine corrigée",
  })
  reversalOfId!: string | null;
}

/**
 * Correction d'une dépense dont la période comptable est clôturée — ne
 * modifie jamais la ligne d'origine (immuable) : crée une contre-passation
 * (montant négatif) puis, sauf `cancel`, une ligne de remplacement, toutes
 * deux datées dans la période courante ouverte (voir
 * FinanceService.correctExpense).
 */
export class CorrectFinanceExpenseDto {
  @ApiProperty({
    description: 'Motif de la correction — conservé dans notes',
  })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Annule la dépense sans la remplacer (aucune ligne de remplacement créée)',
  })
  @IsOptional()
  cancel?: boolean;

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

// ---- Periods ----

export class FinancePeriodDto {
  @ApiProperty({ example: '2026-07' }) period!: string;
  @ApiProperty({ enum: FinancePeriodStatus }) status!: FinancePeriodStatus;
  @ApiProperty({ nullable: true }) closedAt!: string | null;
}

// ---- Debts ----

export class CreateFinanceDebtDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  creditorName!: string;

  @ApiProperty({ example: 20000 })
  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Par défaut égal à totalAmount à la création',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingAmount?: number;

  @ApiPropertyOptional({ nullable: true, example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateFinanceDebtDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  creditorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingAmount?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export enum DerivedDebtStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export class FinanceDebtDto {
  @ApiProperty() id!: string;
  @ApiProperty() creditorName!: string;
  @ApiProperty() totalAmount!: number;
  @ApiProperty() remainingAmount!: number;
  @ApiProperty({ nullable: true }) dueDate!: string | null;
  @ApiProperty({ enum: DerivedDebtStatus }) status!: DerivedDebtStatus;
  @ApiProperty({ nullable: true }) notes!: string | null;
}

// ---- Accounts ----

export class CreateFinanceAccountDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: FinanceAccountType })
  @IsEnum(FinanceAccountType)
  type!: FinanceAccountType;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateFinanceAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ enum: FinanceAccountType })
  @IsOptional()
  @IsEnum(FinanceAccountType)
  type?: FinanceAccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class FinanceAccountDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: FinanceAccountType }) type!: FinanceAccountType;
  @ApiProperty() balance!: number;
  @ApiProperty({ nullable: true }) notes!: string | null;
}

// ---- Overview ----

export class FinanceOverviewDto {
  @ApiProperty({
    description: 'Somme des montants des contrats ACTIVE et non expirés',
  })
  activeContractsRevenue!: number;

  @ApiProperty({ description: 'Somme des dépenses sur la période demandée' })
  totalExpenses!: number;

  @ApiProperty({
    description: 'Somme des remainingAmount de toutes les dettes',
  })
  totalDebtRemaining!: number;

  @ApiProperty({ description: 'Somme des soldes de tous les comptes' })
  totalAccountsBalance!: number;

  @ApiProperty({
    description:
      "Sous-total des dépenses de catégorie SALARIES, déjà comptées dans totalExpenses (pas une addition séparée) — toujours 0 si l'appelant n'a pas employee.salary.manage/company.manage (donnée sensible, jamais exposée même agrégée)",
  })
  payrollMass!: number;
}
