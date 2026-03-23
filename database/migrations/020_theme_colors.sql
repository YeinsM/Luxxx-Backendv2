-- Migration 020: Theme color settings
-- Adds configurable gradient colors (from/to) to admin_settings.
-- Empty string = use code defaults (purple-600 → pink-500).

INSERT INTO admin_settings (key, value, updated_at)
VALUES
  ('theme_color_from', '', NOW()),
  ('theme_color_to',   '', NOW())
ON CONFLICT (key) DO NOTHING;
