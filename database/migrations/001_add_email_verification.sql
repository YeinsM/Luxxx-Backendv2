-- Migration: Add email verification fields
-- Date: 2026-02-11
-- Description: Adds email_verification_token and email_verification_expires fields to users table

-- Add new columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE;

-- Create index for verification token
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token);

-- Add comments
COMMENT ON COLUMN users.email_verification_token IS 'Token used for email verification';
COMMENT ON COLUMN users.email_verification_expires IS 'Expiration date for verification token';
