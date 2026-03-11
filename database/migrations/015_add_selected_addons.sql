-- Migration 015: Add selected_addons column to advertisements
-- Tracks which paid add-ons the escort has purchased for their active promotion
-- Values: array of strings, e.g. ['promo_sticker', 'emoji_title']

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS selected_addons TEXT[] DEFAULT '{}';
