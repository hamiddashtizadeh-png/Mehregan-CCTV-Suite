-- Migration: 0005_purchases_and_landed_cost.sql
-- Module 05: Purchases, Proformas, Multi-Currency, Landed Cost Allocation, Supplier Liability & Authoritative Accounting Sync
-- Policy: Non-destructive DDL (IF NOT EXISTS). Never drops existing tables or alters primary keys destructively.

-- 1. Alter item_serials to add purchase_invoice_id and unit_cost_irr if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'item_serials' AND column_name = 'purchase_invoice_id'
  ) THEN
    ALTER TABLE item_serials ADD COLUMN purchase_invoice_id INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'item_serials' AND column_name = 'unit_cost_irr'
  ) THEN
    ALTER TABLE item_serials ADD COLUMN unit_cost_irr NUMERIC(18, 2);
  END IF;
END $$;

-- 2. Create purchase_proformas table
CREATE TABLE IF NOT EXISTS purchase_proformas (
  id SERIAL PRIMARY KEY,
  proforma_number TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES parties(id),
  date_jalali TEXT NOT NULL,
  valid_until_jalali TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IRR',
  exchange_rate_to_irr NUMERIC(18, 4) NOT NULL DEFAULT 1,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  converted_invoice_id INTEGER,
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_proformas_number_idx ON purchase_proformas (proforma_number);

-- 3. Create purchase_invoices table
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  supplier_invoice_number TEXT,
  supplier_id INTEGER NOT NULL REFERENCES parties(id),
  target_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  proforma_id INTEGER REFERENCES purchase_proformas(id),
  date_jalali TEXT NOT NULL,
  due_date_jalali TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IRR',
  exchange_rate_to_irr NUMERIC(18, 4) NOT NULL DEFAULT 1,
  cost_allocation_method TEXT NOT NULL DEFAULT 'BY_VALUE',
  freight_cost_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  insurance_cost_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  packaging_cost_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  customs_cost_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  non_refundable_tax_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  other_landed_cost_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_landed_costs_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_net_items_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_discount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_vat_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_invoice_payable_to_supplier_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_inventory_valuation_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  paid_amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  remaining_debt_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  inventory_doc_id INTEGER REFERENCES inventory_documents(id),
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_invoices_number_idx ON purchase_invoices (invoice_number);

-- 4. Create purchase_payments table
CREATE TABLE IF NOT EXISTS purchase_payments (
  id SERIAL PRIMARY KEY,
  payment_number TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES parties(id),
  purchase_invoice_id INTEGER REFERENCES purchase_invoices(id),
  payment_date_jalali TEXT NOT NULL,
  amount_irr NUMERIC(18, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  source_account_or_bank TEXT NOT NULL,
  tracking_reference TEXT NOT NULL,
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_payments_number_idx ON purchase_payments (payment_number);

-- 5. Create purchase_returns table
CREATE TABLE IF NOT EXISTS purchase_returns (
  id SERIAL PRIMARY KEY,
  return_number TEXT NOT NULL,
  purchase_invoice_id INTEGER NOT NULL REFERENCES purchase_invoices(id),
  supplier_id INTEGER NOT NULL REFERENCES parties(id),
  source_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  date_jalali TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_return_credit_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  inventory_doc_id INTEGER REFERENCES inventory_documents(id),
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_returns_number_idx ON purchase_returns (return_number);
