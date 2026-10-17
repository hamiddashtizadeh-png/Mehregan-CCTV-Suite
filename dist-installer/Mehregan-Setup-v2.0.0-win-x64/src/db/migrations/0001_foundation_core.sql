-- ==============================================================================
-- Migration: 0001_foundation_core.sql
-- Module 01: Foundation Core System Tables
-- Safety: Non-destructive DDL (CREATE TABLE IF NOT EXISTS). Never drops tables.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'فروشگاه دوربین مداربسته و سیستم‌های امنیتی مهرگان',
  economic_code TEXT NOT NULL DEFAULT '411-8920-3314',
  national_id TEXT NOT NULL DEFAULT '14009871230',
  phone TEXT NOT NULL DEFAULT '021-66748920',
  address_fa TEXT NOT NULL DEFAULT 'تهران، خیابان جمهوری، تقاطع حافظ، مجتمع تجاری تخصصی مهرگان، طبقه ۲',
  base_currency_code TEXT NOT NULL DEFAULT 'IRR',
  display_currency_code TEXT NOT NULL DEFAULT 'IRT',
  inventory_costing_method TEXT NOT NULL DEFAULT 'SPECIFIC_OR_FIFO',
  landed_cost_allocation_default TEXT NOT NULL DEFAULT 'BY_VALUE',
  setup_completed BOOLEAN NOT NULL DEFAULT TRUE,
  active_fiscal_year_code TEXT NOT NULL DEFAULT '1405',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 0,
  is_base_ledger BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency_code TEXT NOT NULL,
  to_currency_code TEXT NOT NULL DEFAULT 'IRR',
  rate_to_irr NUMERIC(18, 2) NOT NULL,
  effective_date_jalali TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  source_note_fa TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal_years (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title_fa TEXT NOT NULL,
  start_date_jalali TEXT NOT NULL,
  end_date_jalali TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  is_current BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS document_numbering_rules (
  id SERIAL PRIMARY KEY,
  doc_type TEXT NOT NULL UNIQUE,
  title_fa TEXT NOT NULL,
  prefix TEXT NOT NULL,
  fiscal_year_code TEXT NOT NULL DEFAULT '1405',
  padding_digits INTEGER NOT NULL DEFAULT 5,
  start_number INTEGER NOT NULL DEFAULT 10001,
  current_number INTEGER NOT NULL DEFAULT 10001,
  immutable_history_policy TEXT NOT NULL DEFAULT 'REVERSAL_ONLY'
);
