-- Migration 033: Add preferred_language column to users table
-- Stores the user's preferred language for email delivery (en, es, nl, pt, pl)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'es';

COMMENT ON COLUMN users.preferred_language IS 'ISO language code for email delivery: en, es, nl, pt, pl';
