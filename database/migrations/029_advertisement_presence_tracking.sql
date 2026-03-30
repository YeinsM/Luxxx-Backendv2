-- Migration 029: real-time advertisement presence tracking.

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS last_seen_online_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS presence_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_advertisements_presence_expires_at
  ON advertisements (presence_expires_at)
  WHERE presence_expires_at IS NOT NULL;
