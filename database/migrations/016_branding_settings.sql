-- Migration 016: Branding settings
-- Añade campos de nombre de la app y logos al key-value store de admin_settings

INSERT INTO admin_settings (key, value, updated_at)
VALUES
  ('app_name',          'Luxxx',  NOW()),
  ('app_logo_url',       '',      NOW()),
  ('app_logo_dark_url',  '',      NOW()),
  ('app_favicon_url',    '',      NOW())
ON CONFLICT (key) DO NOTHING;
