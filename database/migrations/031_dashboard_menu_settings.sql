-- Migration 031: Dashboard menu visibility settings
-- Allows admin to toggle individual menu items in the escort/model dashboard sidebar.
-- Uses the same admin_settings key-value pattern as public menu and registration toggles.

INSERT INTO admin_settings (key, value, updated_at)
VALUES
  ('dashboard_menu_photos_enabled', 'true', NOW()),
  ('dashboard_menu_reviews_enabled', 'true', NOW()),
  ('dashboard_menu_videos_enabled', 'true', NOW()),
  ('dashboard_menu_available_promotions_enabled', 'true', NOW()),
  ('dashboard_menu_boost_enabled', 'true', NOW()),
  ('dashboard_menu_buy_credits_enabled', 'true', NOW()),
  ('dashboard_menu_video_promotion_enabled', 'true', NOW()),
  ('dashboard_menu_messages_enabled', 'true', NOW()),
  ('dashboard_menu_notifications_enabled', 'true', NOW()),
  ('dashboard_menu_saved_search_enabled', 'true', NOW()),
  ('dashboard_menu_invoice_enabled', 'true', NOW()),
  ('dashboard_menu_balance_enabled', 'true', NOW())
ON CONFLICT (key) DO NOTHING;
