-- Migration: 0008_treasury_and_cash_flow.sql
-- Module 08: Treasury, Cash & Bank Accounts, Cheques, Installments & Operational Expenses
-- Policy: Non-destructive DDL (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS cash_boxes (
  id SERIAL PRIMARY KEY,
  box_code TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  cashier_user_id INTEGER REFERENCES users(id),
  balance_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS cash_boxes_code_idx ON cash_boxes(box_code);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  account_code TEXT NOT NULL,
  bank_name_fa TEXT NOT NULL,
  account_number TEXT NOT NULL,
  shaba_number TEXT,
  balance_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_code_idx ON bank_accounts(account_code);

CREATE TABLE IF NOT EXISTS cheques (
  id SERIAL PRIMARY KEY,
  cheque_number TEXT NOT NULL,
  cheque_type TEXT NOT NULL DEFAULT 'INBOUND',
  party_id INTEGER NOT NULL REFERENCES parties(id),
  bank_name_fa TEXT NOT NULL,
  branch_name_fa TEXT,
  amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  issue_date_jalali TEXT NOT NULL,
  due_date_jalali TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_HAND',
  deposit_bank_account_id INTEGER REFERENCES bank_accounts(id),
  cleared_date_jalali TEXT,
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS treasury_transactions (
  id SERIAL PRIMARY KEY,
  tx_number TEXT NOT NULL,
  tx_type TEXT NOT NULL,
  date_jalali TEXT NOT NULL,
  party_id INTEGER REFERENCES parties(id),
  amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  source_cash_box_id INTEGER REFERENCES cash_boxes(id),
  source_bank_account_id INTEGER REFERENCES bank_accounts(id),
  target_cash_box_id INTEGER REFERENCES cash_boxes(id),
  target_bank_account_id INTEGER REFERENCES bank_accounts(id),
  cheque_id INTEGER REFERENCES cheques(id),
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS treasury_transactions_number_idx ON treasury_transactions(tx_number);

CREATE TABLE IF NOT EXISTS installments (
  id SERIAL PRIMARY KEY,
  installment_code TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  party_id INTEGER NOT NULL REFERENCES parties(id),
  sales_invoice_id INTEGER REFERENCES sales_invoices(id),
  purchase_invoice_id INTEGER REFERENCES purchase_invoices(id),
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  due_date_jalali TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  paid_date_jalali TEXT,
  notes_fa TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS operational_expenses (
  id SERIAL PRIMARY KEY,
  expense_code TEXT NOT NULL,
  category_fa TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  date_jalali TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  source_bank_or_cash TEXT NOT NULL,
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS operational_expenses_code_idx ON operational_expenses(expense_code);
