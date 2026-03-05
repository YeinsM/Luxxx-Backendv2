-- Migration 007: Add body_type column to advertisements table
-- body_type was missing from the schema, causing bodyType to never be saved or returned

ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS body_type VARCHAR(50);
