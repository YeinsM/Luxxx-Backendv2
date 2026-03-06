-- Migration 008: Admin first-login flag and admin settings table
-- Enables the "set password on first login" flow and storable admin config

-- 1. Add force_password_change flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Admin settings key-value store
CREATE TABLE IF NOT EXISTS admin_settings (
  key         VARCHAR(255) PRIMARY KEY,
  value       TEXT         NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Default security alert email (empty — admin must configure it)
INSERT INTO admin_settings (key, value, updated_at)
VALUES ('security_alert_email', '', NOW())
ON CONFLICT (key) DO NOTHING;
