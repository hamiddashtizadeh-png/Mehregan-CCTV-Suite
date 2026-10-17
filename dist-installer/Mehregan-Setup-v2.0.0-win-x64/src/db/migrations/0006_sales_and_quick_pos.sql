-- Migration: 0006_sales_and_quick_pos.sql
-- Module 06: Sales, Proforma Quotes, Quick POS Sale, Receipts, Sales Returns & Integrated COGS
-- Policy: Non-destructive DDL (IF NOT EXISTS).

-- 1. Create sales_proformas table
CREATE TABLE IF NOT EXISTS sales_proformas (
  id SERIAL PRIMARY KEY,
  proforma_number TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES parties(id),
  date_jalali TEXT NOT NULL,
  valid_until_jalali TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_items_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_discount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_vat_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_payable_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  converted_invoice_id INTEGER,
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_proformas_number_idx ON sales_proformas (proforma_number);

-- 2. Create sales_invoices table
CREATE TABLE IF NOT EXISTS sales_invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  sale_type TEXT NOT NULL DEFAULT 'STANDARD_SALE',
  customer_id INTEGER NOT NULL REFERENCES parties(id),
  source_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  proforma_id INTEGER REFERENCES sales_proformas(id),
  date_jalali TEXT NOT NULL,
  due_date_jalali TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_net_items_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_discount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_vat_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_invoice_amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_cogs_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  paid_amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  remaining_balance_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  inventory_doc_id INTEGER REFERENCES inventory_documents(id),
  payment_details JSONB,
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_invoices_number_idx ON sales_invoices (invoice_number);

-- 3. Create sales_receipts table
CREATE TABLE IF NOT EXISTS sales_receipts (
  id SERIAL PRIMARY KEY,
  receipt_number TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES parties(id),
  sales_invoice_id INTEGER REFERENCES sales_invoices(id),
  payment_date_jalali TEXT NOT NULL,
  amount_irr NUMERIC(18, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'POS',
  destination_bank_or_cash TEXT NOT NULL,
  tracking_reference TEXT NOT NULL,
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_receipts_number_idx ON sales_receipts (receipt_number);

-- 4. Create sales_returns table
CREATE TABLE IF NOT EXISTS sales_returns (
  id SERIAL PRIMARY KEY,
  returnNumber TEXT NOT NULL,
  sales_invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id),
  customer_id INTEGER NOT NULL REFERENCES parties(id),
  target_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  date_jalali TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_refund_amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  inventory_doc_id INTEGER REFERENCES inventory_documents(id),
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  notesFa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_returns_number_idx ON sales_returns (return_number);
