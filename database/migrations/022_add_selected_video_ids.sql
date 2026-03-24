-- Migration 022: Add selected_video_ids to advertisements
-- Allows escorts to choose which videos from their album appear on their public ad.

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS selected_video_ids TEXT[] DEFAULT '{}';
