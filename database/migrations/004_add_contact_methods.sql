-- ============================================================
-- MIGRATION 004: Add contact method preferences to advertisements
-- Adds toggles for phone, WhatsApp, Signal, Telegram, SMS, Kinky
-- ============================================================

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS contact_by_phone BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_by_whatsapp BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_by_signal BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_by_telegram BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_by_sms BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_by_kinky BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS kinky_email_frequency VARCHAR(20) DEFAULT 'every';

-- Add comment for documentation
COMMENT ON COLUMN advertisements.contact_by_phone IS 'Allow contact via phone call';
COMMENT ON COLUMN advertisements.contact_by_whatsapp IS 'Allow contact via WhatsApp';
COMMENT ON COLUMN advertisements.contact_by_signal IS 'Allow contact via Signal';
COMMENT ON COLUMN advertisements.contact_by_telegram IS 'Allow contact via Telegram';
COMMENT ON COLUMN advertisements.contact_by_sms IS 'Allow contact via SMS';
COMMENT ON COLUMN advertisements.contact_by_kinky IS 'Allow contact via Kinky messaging';
COMMENT ON COLUMN advertisements.kinky_email_frequency IS 'Email notification frequency for Kinky messages: every, daily, weekly, none';
