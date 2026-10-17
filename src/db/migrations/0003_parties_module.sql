-- Migration: 0003_parties_module.sql
-- Module 03: Parties & Business Counterparties (مشتری، تامین‌کننده، نصاب، سایر)
-- Policy: Non-destructive DDL (IF NOT EXISTS). Never drops existing tables or data.
-- Single authoritative table preventing duplicate entity structures across modules.

CREATE TABLE IF NOT EXISTS parties (
  id SERIAL PRIMARY KEY,
  party_code TEXT NOT NULL UNIQUE,
  primary_type TEXT NOT NULL DEFAULT 'CUSTOMER',
  roles JSONB NOT NULL DEFAULT '["CUSTOMER"]'::jsonb,
  person_type TEXT NOT NULL DEFAULT 'NATURAL',
  full_name TEXT NOT NULL,
  company_title TEXT,
  national_id TEXT UNIQUE,
  economic_code TEXT,
  registration_number TEXT,
  mobile TEXT NOT NULL,
  phone TEXT,
  fax TEXT,
  email TEXT,
  province TEXT NOT NULL DEFAULT 'تهران',
  city TEXT NOT NULL DEFAULT 'تهران',
  postal_code TEXT,
  address_fa TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  credit_limit_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  installer_skills TEXT,
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS parties_mobile_idx ON parties(mobile);
CREATE INDEX IF NOT EXISTS parties_primary_type_idx ON parties(primary_type);
CREATE INDEX IF NOT EXISTS parties_status_idx ON parties(status);

CREATE TABLE IF NOT EXISTS party_transactions (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  record_type TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  date_jalali TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  notes_fa TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS party_transactions_party_id_idx ON party_transactions(party_id);
CREATE INDEX IF NOT EXISTS party_transactions_record_type_idx ON party_transactions(record_type);
