ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100);

COMMENT ON COLUMN advertisements.telegram_username IS
  'Telegram username used to build the public t.me contact link.';