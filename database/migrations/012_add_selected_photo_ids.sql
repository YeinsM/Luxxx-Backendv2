-- Migration 012: Add selected_photo_ids to advertisements
-- Allows escorts to choose which photos from their album appear on their public ad.

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS selected_photo_ids TEXT[] DEFAULT '{}';
