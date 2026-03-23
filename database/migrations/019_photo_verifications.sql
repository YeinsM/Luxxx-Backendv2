-- Migration 019: Photo verifications
-- Allows admins to review and approve/reject photos submitted after an ad is published.

CREATE TABLE IF NOT EXISTS photo_verifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url        TEXT NOT NULL,
  public_id        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  admin_comment    TEXT,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMP WITH TIME ZONE,
  UNIQUE (public_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_verifications_user   ON photo_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_verifications_ad     ON photo_verifications(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_photo_verifications_status ON photo_verifications(status);
