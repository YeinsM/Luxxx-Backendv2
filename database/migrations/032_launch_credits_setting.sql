-- Migration 032: Add launch credits email setting
-- Controls whether newly registered escorts receive 100 welcome credits

INSERT INTO admin_settings (key, value, updated_at)
VALUES ('launch_credits_email_enabled', 'true', NOW())
ON CONFLICT (key) DO NOTHING;
