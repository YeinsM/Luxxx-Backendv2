ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS reviews_visible BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN advertisements.reviews_visible IS
  'Whether ratings and public reviews are visible on the public profile.';