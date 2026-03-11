-- Migration 013: Add selected_plan and selected_duration to advertisements
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS selected_plan VARCHAR(20),
  ADD COLUMN IF NOT EXISTS selected_duration VARCHAR(10);
