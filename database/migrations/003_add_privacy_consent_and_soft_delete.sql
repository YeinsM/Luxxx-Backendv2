-- ============================================================
-- MIGRATION 003: Privacy consent + account soft delete support
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS privacy_consent_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_soft_deleted_at
  ON users(soft_deleted_at);

COMMENT ON COLUMN users.privacy_consent_accepted_at IS 'Timestamp when user accepted privacy policy';
COMMENT ON COLUMN users.soft_deleted_at IS 'Soft delete timestamp; null means active account';
