-- Migration: Add password reset fields and token version for session invalidation
-- Date: 2026-02-14

ALTER TABLE users
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS password_reset_used_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_password_reset_token_hash ON users(password_reset_token_hash);

COMMENT ON COLUMN users.token_version IS 'Incremented to invalidate previously issued JWTs';
COMMENT ON COLUMN users.password_reset_token_hash IS 'SHA-256 hash of one-time password reset token';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration date for password reset token';
COMMENT ON COLUMN users.password_reset_used_at IS 'Timestamp when reset token was consumed';
