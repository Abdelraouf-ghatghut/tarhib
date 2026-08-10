import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}
export enum BudgetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  LOCKED = 'LOCKED',
}
export enum AttendanceStatus {
  PENDING = 'PENDING',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}
export enum ForecastKind {
  DEMAND = 'DEMAND',
  STOCK = 'STOCK',
  CASH = 'CASH',
}

export interface InvoiceLineValue {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  productId?: string;
}
export interface BudgetLineValue {
  period: string;
  accountCode?: string;
  costCenter: string;
  amount: number;
}

@Entity('billing_invoices')
export class BillingInvoice {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'contract_id', type: 'uuid', nullable: true }) contractId!:
    | string
    | null;
  @Column({ unique: true }) number!: string;
  @Column({ name: 'issue_date', type: 'date' }) issueDate!: string;
  @Column({ name: 'due_date', type: 'date' }) dueDate!: string;
  @Column({ name: 'service_from', type: 'date' }) serviceFrom!: string;
  @Column({ name: 'service_to', type: 'date' }) serviceTo!: string;
  @Column({ type: 'varchar', length: 24, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;
  @Column({ type: 'varchar', length: 3, default: 'SAR' }) currency!: string;
  @Column({ type: 'jsonb' }) lines!: InvoiceLineValue[];
  @Column({ name: 'subtotal', type: 'decimal', precision: 14, scale: 2 })
  subtotal!: number;
  @Column({ name: 'tax_amount', type: 'decimal', precision: 14, scale: 2 })
  taxAmount!: number;
  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount!: number;
  @Column({
    name: 'recognized_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  recognizedAmount!: number;
  @Column({
    name: 'paid_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  paidAmount!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('billing_payments')
export class BillingPayment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'invoice_id', type: 'uuid' }) invoiceId!: string;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) amount!: number;
  @Column({ name: 'paid_at', type: 'timestamptz' }) paidAt!: Date;
  @Column({ type: 'varchar', length: 30 }) method!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) reference!:
    | string
    | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('billing_revenue_recognition')
export class BillingRevenueRecognition {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'invoice_id', type: 'uuid' }) invoiceId!: string;
  @Column({ name: 'recognition_date', type: 'date' }) recognitionDate!: string;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) amount!: number;
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('generated_documents')
export class GeneratedDocument {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'entity_type', type: 'varchar', length: 40 })
  entityType!: string;
  @Column({ name: 'entity_id', type: 'uuid' }) entityId!: string;
  @Column({ type: 'varchar', length: 5 }) language!: string;
  @Column({ name: 'template_version', type: 'varchar', length: 30 })
  templateVersion!: string;
  @Column({ name: 'mime_type', type: 'varchar', length: 80 }) mimeType!: string;
  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;
  @Column({ type: 'varchar', length: 64 }) sha256!: string;
  @Column({ type: 'bytea' }) content!: Buffer;
  @Column({
    name: 'generated_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  generatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('management_budgets')
export class ManagementBudget {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'fiscal_year', type: 'int' }) fiscalYear!: number;
  @Column({ name: 'company_id', type: 'uuid', nullable: true }) companyId!:
    | string
    | null;
  @Column({ name: 'branch_id', type: 'uuid', nullable: true }) branchId!:
    | string
    | null;
  @Column({ type: 'int', default: 1 }) version!: number;
  @Column({ type: 'varchar', length: 20, default: BudgetStatus.DRAFT })
  status!: BudgetStatus;
  @Column({ type: 'jsonb' }) lines!: BudgetLineValue[];
  @Column({ name: 'total_amount', type: 'decimal', precision: 14, scale: 2 })
  totalAmount!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('order_cost_snapshots')
export class OrderCostSnapshot {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'order_id', type: 'uuid', unique: true }) orderId!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'branch_id', type: 'uuid' }) branchId!: string;
  @Column({
    name: 'product_cost',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  productCost!: number;
  @Column({
    name: 'labor_cost',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  laborCost!: number;
  @Column({
    name: 'delivery_cost',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  deliveryCost!: number;
  @Column({
    name: 'overhead_cost',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  overheadCost!: number;
  @Column({ name: 'total_cost', type: 'decimal', precision: 14, scale: 2 })
  totalCost!: number;
  @Column({
    name: 'calculation_version',
    type: 'varchar',
    length: 30,
    default: 'manual-v1',
  })
  calculationVersion!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('service_feedback')
export class ServiceFeedback {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id', type: 'uuid' }) companyId!: string;
  @Column({ name: 'order_id', type: 'uuid', nullable: true }) orderId!:
    | string
    | null;
  @Column({ name: 'booking_id', type: 'uuid', nullable: true }) bookingId!:
    | string
    | null;
  @Column({ name: 'employee_id', type: 'uuid', nullable: true }) employeeId!:
    | string
    | null;
  @Column({ type: 'int' }) rating!: number;
  @Column({ name: 'quality_rating', type: 'int', nullable: true })
  qualityRating!: number | null;
  @Column({ name: 'punctuality_rating', type: 'int', nullable: true })
  punctualityRating!: number | null;
  @Column({ type: 'text', nullable: true }) comment!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('booking_attendance')
export class BookingAttendance {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'booking_id', type: 'uuid', unique: true })
  bookingId!: string;
  @Column({ type: 'varchar', length: 20, default: AttendanceStatus.PENDING })
  status!: AttendanceStatus;
  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt!: Date | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
  @Column({ name: 'actual_participants', type: 'int', nullable: true })
  actualParticipants!: number | null;
  @Column({
    name: 'absence_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  absenceReason!: string | null;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('forecast_snapshots')
export class ForecastSnapshot {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 20 }) kind!: ForecastKind;
  @Column({ name: 'company_id', type: 'uuid', nullable: true }) companyId!:
    | string
    | null;
  @Column({ name: 'branch_id', type: 'uuid', nullable: true }) branchId!:
    | string
    | null;
  @Column({ name: 'entity_id', type: 'uuid', nullable: true }) entityId!:
    | string
    | null;
  @Column({ name: 'forecast_date', type: 'date' }) forecastDate!: string;
  @Column({ name: 'predicted_value', type: 'decimal', precision: 14, scale: 2 })
  predictedValue!: number;
  @Column({ name: 'lower_bound', type: 'decimal', precision: 14, scale: 2 })
  lowerBound!: number;
  @Column({ name: 'upper_bound', type: 'decimal', precision: 14, scale: 2 })
  upperBound!: number;
  @Column({
    name: 'model_version',
    type: 'varchar',
    length: 40,
    default: 'weighted-average-v1',
  })
  modelVersion!: string;
  @Column({ type: 'jsonb', nullable: true }) factors!: Record<
    string,
    unknown
  > | null;
  @CreateDateColumn({ name: 'generated_at' }) generatedAt!: Date;
}
