import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '../entities/chart-of-account.entity.js';
import {
  JournalEntrySource,
  JournalEntryStatus,
} from '../entities/journal-entry.entity.js';
import { FiscalYearStatus } from '../entities/fiscal-year.entity.js';

// ---- Chart of accounts ----

export class CreateChartOfAccountDto {
  @ApiProperty({ example: '606100' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  label!: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateChartOfAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ChartOfAccountDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ enum: AccountType }) type!: AccountType;
  @ApiProperty({ nullable: true }) parentId!: string | null;
  @ApiProperty() active!: boolean;
}

// ---- Journal entries ----

export class CreateJournalEntryLineDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  debit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credit?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  label?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  companyId?: string | null;
}

export class CreateJournalEntryDto {
  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  label!: string;

  @ApiProperty({ type: [CreateJournalEntryLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines!: CreateJournalEntryLineDto[];
}

export class JournalEntryLineDto {
  @ApiProperty() id!: string;
  @ApiProperty() accountId!: string;
  @ApiProperty() debit!: number;
  @ApiProperty() credit!: number;
  @ApiProperty({ nullable: true }) label!: string | null;
  @ApiProperty({ nullable: true }) companyId!: string | null;
}

export class JournalEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty() date!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ enum: JournalEntrySource }) source!: JournalEntrySource;
  @ApiProperty({ nullable: true }) sourceId!: string | null;
  @ApiProperty({ enum: JournalEntryStatus }) status!: JournalEntryStatus;
  @ApiProperty({ nullable: true }) postedBy!: string | null;
  @ApiProperty() fiscalYearId!: string;
  @ApiProperty({ type: [JournalEntryLineDto] }) lines!: JournalEntryLineDto[];
}

// ---- Reports ----

export class LedgerEntryDto {
  @ApiProperty() journalEntryId!: string;
  @ApiProperty() reference!: string;
  @ApiProperty() date!: string;
  @ApiProperty() label!: string;
  @ApiProperty() debit!: number;
  @ApiProperty() credit!: number;
}

export class TrialBalanceRowDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() label!: string;
  @ApiProperty() totalDebit!: number;
  @ApiProperty() totalCredit!: number;
  @ApiProperty() balance!: number;
}

export class BalanceSheetDto {
  @ApiProperty() totalAssets!: number;
  @ApiProperty() totalLiabilities!: number;
  @ApiProperty() totalEquity!: number;
  @ApiProperty({ type: [TrialBalanceRowDto] }) assets!: TrialBalanceRowDto[];
  @ApiProperty({ type: [TrialBalanceRowDto] })
  liabilities!: TrialBalanceRowDto[];
  @ApiProperty({ type: [TrialBalanceRowDto] }) equity!: TrialBalanceRowDto[];
}

export class IncomeStatementDto {
  @ApiProperty() totalRevenue!: number;
  @ApiProperty() totalExpense!: number;
  @ApiProperty() netProfit!: number;
  @ApiProperty({ type: [TrialBalanceRowDto] }) revenue!: TrialBalanceRowDto[];
  @ApiProperty({ type: [TrialBalanceRowDto] }) expense!: TrialBalanceRowDto[];
}

// ---- Fiscal years ----

export class FiscalYearDto {
  @ApiProperty() id!: string;
  @ApiProperty() year!: number;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty({ enum: FiscalYearStatus }) status!: FiscalYearStatus;
  @ApiProperty({ nullable: true }) closedAt!: string | null;
}

export class CloseFiscalYearResultDto {
  @ApiProperty() fiscalYear!: FiscalYearDto;
  @ApiPropertyOptional({
    description:
      "Écriture d'impôt sur les bénéfices en brouillon, à valider avant que la clôture ne devienne définitive",
    type: JournalEntryDto,
  })
  draftTaxEntry?: JournalEntryDto | null;
}
