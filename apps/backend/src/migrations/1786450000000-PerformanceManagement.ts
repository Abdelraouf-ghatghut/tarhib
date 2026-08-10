import { MigrationInterface, QueryRunner } from 'typeorm';

export class PerformanceManagement1786450000000 implements MigrationInterface {
  name = 'PerformanceManagement1786450000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE billing_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES companies(id),
      contract_id UUID REFERENCES finance_contracts(id), number VARCHAR NOT NULL UNIQUE,
      issue_date DATE NOT NULL, due_date DATE NOT NULL, service_from DATE NOT NULL, service_to DATE NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')),
      currency VARCHAR(3) NOT NULL DEFAULT 'SAR', lines JSONB NOT NULL,
      subtotal DECIMAL(14,2) NOT NULL, tax_amount DECIMAL(14,2) NOT NULL,
      total_amount DECIMAL(14,2) NOT NULL, recognized_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await q.query(
      `CREATE INDEX idx_billing_invoices_company_dates ON billing_invoices(company_id, issue_date, service_from, service_to)`,
    );
    await q.query(`CREATE TABLE billing_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES billing_invoices(id),
      amount DECIMAL(14,2) NOT NULL CHECK (amount > 0), paid_at TIMESTAMPTZ NOT NULL,
      method VARCHAR(30) NOT NULL, reference VARCHAR(120), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await q.query(`CREATE TABLE billing_revenue_recognition (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES billing_invoices(id),
      recognition_date DATE NOT NULL, amount DECIMAL(14,2) NOT NULL CHECK (amount >= 0), posted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(invoice_id, recognition_date))`);
    await q.query(`CREATE TABLE generated_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), entity_type VARCHAR(40) NOT NULL, entity_id UUID NOT NULL,
      language VARCHAR(5) NOT NULL, template_version VARCHAR(30) NOT NULL, mime_type VARCHAR(80) NOT NULL,
      file_name VARCHAR(255) NOT NULL, sha256 VARCHAR(64) NOT NULL, content BYTEA NOT NULL,
      generated_by VARCHAR(100), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(entity_type, entity_id, language, template_version))`);
    await q.query(`INSERT INTO chart_of_accounts(code, label, type, active)
      VALUES ('487000', 'Produits constatés d avance', 'LIABILITY', true) ON CONFLICT (code) DO NOTHING`);
    await q.query(`CREATE TABLE management_budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), fiscal_year INT NOT NULL, company_id UUID REFERENCES companies(id),
      branch_id UUID REFERENCES branches(id), version INT NOT NULL DEFAULT 1,
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','LOCKED')),
      lines JSONB NOT NULL, total_amount DECIMAL(14,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(fiscal_year, company_id, branch_id, version))`);
    await q.query(`CREATE TABLE order_cost_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
      company_id UUID NOT NULL REFERENCES companies(id), branch_id UUID NOT NULL REFERENCES branches(id),
      product_cost DECIMAL(14,2) NOT NULL DEFAULT 0, labor_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      delivery_cost DECIMAL(14,2) NOT NULL DEFAULT 0, overhead_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_cost DECIMAL(14,2) NOT NULL, calculation_version VARCHAR(30) NOT NULL DEFAULT 'manual-v1',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await q.query(`CREATE TABLE service_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID NOT NULL REFERENCES companies(id),
      order_id UUID REFERENCES orders(id), booking_id UUID REFERENCES room_bookings(id), employee_id UUID REFERENCES employees(id),
      rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), quality_rating INT CHECK (quality_rating BETWEEN 1 AND 5),
      punctuality_rating INT CHECK (punctuality_rating BETWEEN 1 AND 5), comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (order_id IS NOT NULL OR booking_id IS NOT NULL))`);
    await q.query(`CREATE TABLE booking_attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL UNIQUE REFERENCES room_bookings(id),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CHECKED_IN','COMPLETED','NO_SHOW')),
      checked_in_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, actual_participants INT CHECK (actual_participants >= 0),
      absence_reason VARCHAR(255), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await q.query(`CREATE TABLE forecast_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), kind VARCHAR(20) NOT NULL CHECK (kind IN ('DEMAND','STOCK','CASH')),
      company_id UUID REFERENCES companies(id), branch_id UUID REFERENCES branches(id), entity_id UUID,
      forecast_date DATE NOT NULL, predicted_value DECIMAL(14,2) NOT NULL, lower_bound DECIMAL(14,2) NOT NULL,
      upper_bound DECIMAL(14,2) NOT NULL, model_version VARCHAR(40) NOT NULL DEFAULT 'weighted-average-v1',
      factors JSONB, generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await q.query(
      `CREATE INDEX idx_forecasts_scope_date ON forecast_snapshots(kind, company_id, branch_id, forecast_date)`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE IF EXISTS forecast_snapshots');
    await q.query('DROP TABLE IF EXISTS booking_attendance');
    await q.query('DROP TABLE IF EXISTS service_feedback');
    await q.query('DROP TABLE IF EXISTS order_cost_snapshots');
    await q.query('DROP TABLE IF EXISTS management_budgets');
    await q.query('DROP TABLE IF EXISTS billing_payments');
    await q.query('DROP TABLE IF EXISTS billing_revenue_recognition');
    await q.query('DROP TABLE IF EXISTS generated_documents');
    await q.query('DROP TABLE IF EXISTS billing_invoices');
  }
}
