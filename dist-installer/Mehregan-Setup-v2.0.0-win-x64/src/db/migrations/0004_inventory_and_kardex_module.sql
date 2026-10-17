-- Migration: 0004_inventory_and_kardex_module.sql
-- Module 04: Inventory, Items, Categories, Brands, Technical Specs, Warehouses, Serial/MAC Tracking & Authoritative Kardex
-- Policy: Non-destructive DDL (IF NOT EXISTS). Never drops existing tables or data.

ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS allow_negative_inventory BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS item_categories (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  description_fa TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_brands (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_fa TEXT NOT NULL,
  origin_country_fa TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_units (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_fa TEXT NOT NULL,
  allow_decimals BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  item_code TEXT NOT NULL UNIQUE,
  barcode TEXT UNIQUE,
  title_fa TEXT NOT NULL,
  model TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES item_categories(id),
  brand_id INTEGER NOT NULL REFERENCES item_brands(id),
  unit_id INTEGER NOT NULL REFERENCES item_units(id),
  is_serialized BOOLEAN NOT NULL DEFAULT false,
  has_mac_address BOOLEAN NOT NULL DEFAULT false,
  technical_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  min_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 5,
  max_stock_level NUMERIC(12, 2),
  purchase_price_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  sale_price_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS items_model_idx ON items(model);
CREATE INDEX IF NOT EXISTS items_category_idx ON items(category_id);
CREATE INDEX IF NOT EXISTS items_brand_idx ON items(brand_id);

CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  warehouse_code TEXT NOT NULL UNIQUE,
  title_fa TEXT NOT NULL,
  keeper_name_fa TEXT NOT NULL,
  phone TEXT,
  address_fa TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_serials (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  serial_number TEXT NOT NULL UNIQUE,
  mac_address TEXT,
  current_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'IN_STOCK',
  initial_doc_number TEXT,
  last_doc_number TEXT,
  last_party_id INTEGER,
  notes_fa TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS item_serials_item_id_idx ON item_serials(item_id);
CREATE INDEX IF NOT EXISTS item_serials_warehouse_idx ON item_serials(current_warehouse_id);
CREATE INDEX IF NOT EXISTS item_serials_status_idx ON item_serials(status);

CREATE TABLE IF NOT EXISTS inventory_documents (
  id SERIAL PRIMARY KEY,
  doc_number TEXT NOT NULL UNIQUE,
  doc_type TEXT NOT NULL,
  date_jalali TEXT NOT NULL,
  source_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE RESTRICT,
  target_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE RESTRICT,
  party_id INTEGER REFERENCES parties(id) ON DELETE RESTRICT,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount_irr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  notes_fa TEXT,
  actor_user_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_documents_doc_type_idx ON inventory_documents(doc_type);
CREATE INDEX IF NOT EXISTS inventory_documents_party_id_idx ON inventory_documents(party_id);
