-- ==============================================================================
-- Migration: 0002_rbac_and_audit.sql
-- Module 01: Internal Database Auth, Dynamic RBAC & Immutable Audit Logs
-- Safety: Non-destructive DDL. Owner permissions managed strictly via role_permissions.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_initial_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title_fa TEXT NOT NULL,
  description_fa TEXT NOT NULL,
  is_system_role BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  module_number INTEGER NOT NULL,
  module_name_fa TEXT NOT NULL,
  title_fa TEXT NOT NULL,
  description_fa TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_code TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  granted_by TEXT NOT NULL DEFAULT 'SYSTEM_SEED'
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role_code TEXT NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  assigned_by TEXT NOT NULL DEFAULT 'SYSTEM'
);

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  permission_code TEXT NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('DENY', 'ALLOW')),
  reason_fa TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  trace_id TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  actor_user_id INTEGER,
  actor_username TEXT NOT NULL,
  actor_role_summary TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL,
  details_fa TEXT NOT NULL,
  sanitized_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description_fa TEXT NOT NULL,
  checksum TEXT NOT NULL,
  is_destructive BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'APPLIED',
  execution_ms INTEGER NOT NULL DEFAULT 12,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
