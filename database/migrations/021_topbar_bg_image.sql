-- Migration 021: Add topbar background image setting
-- Adds an optional URL key in admin_settings for a custom header background image.
-- When set, the header uses this image instead of the theme gradient.

INSERT INTO admin_settings (key, value, updated_at)
VALUES ('topbar_bg_image', '', NOW())
ON CONFLICT (key) DO NOTHING;
