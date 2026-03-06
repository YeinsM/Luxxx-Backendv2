-- Migration 009: Add verification photos, title_emoji, and role to support new features.

-- 1. Verification photo fields on advertisements
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS verification_photo_presence  TEXT,
  ADD COLUMN IF NOT EXISTS verification_photo_body      TEXT,
  ADD COLUMN IF NOT EXISTS verification_photo_identity  TEXT;

-- Migrate old verification_status values to new enum vocabulary
-- (old: 'pending','approved' → new: 'PENDING','SUBMITTED','VERIFIED','REJECTED')
ALTER TABLE advertisements
  ALTER COLUMN verification_status SET DEFAULT 'PENDING';

UPDATE advertisements
SET verification_status = CASE
  WHEN verification_status = 'pending'   THEN 'PENDING'
  WHEN verification_status = 'submitted' THEN 'SUBMITTED'
  WHEN verification_status = 'approved'  THEN 'VERIFIED'
  WHEN verification_status = 'rejected'  THEN 'REJECTED'
  ELSE 'PENDING'
END;

-- 2. Emoji stored separately so it can be toggled/billed independently
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS title_emoji VARCHAR(10);

-- 3. Role column on users (USER | ADMIN)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
