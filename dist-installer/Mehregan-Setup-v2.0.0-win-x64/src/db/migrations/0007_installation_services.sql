-- Migration: 0007_installation_services.sql
-- Module 07: Installation Services & Enhanced Sales Returns
-- Policy: Non-destructive DDL (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS installation_jobs (
  id SERIAL PRIMARY KEY,
  job_code TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES parties(id),
  sales_invoice_id INTEGER REFERENCES sales_invoices(id),
  installer_id INTEGER REFERENCES parties(id),
  service_fee_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  additional_expenses_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_cost_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  paid_amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  remaining_balance_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  location_address_fa TEXT NOT NULL,
  scheduled_date_jalali TEXT NOT NULL,
  completed_date_jalali TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS installation_jobs_code_idx ON installation_jobs(job_code);
