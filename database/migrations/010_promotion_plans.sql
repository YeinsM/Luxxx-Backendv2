-- Migration 010: Dynamic promotion plans table.
-- Prices and features are managed from the admin panel — nothing is hardcoded.

CREATE TABLE IF NOT EXISTS promotion_plans (
  id           UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(20)              NOT NULL UNIQUE, -- STANDARD | PREMIUM | EXCLUSIVE
  price_per_day     DECIMAL(10,2)       NOT NULL DEFAULT 0,
  price_per_week    DECIMAL(10,2)       NOT NULL DEFAULT 0,
  price_per_month   DECIMAL(10,2)       NOT NULL DEFAULT 0,
  features     JSONB                    NOT NULL DEFAULT '{}',
  is_active    BOOLEAN                  NOT NULL DEFAULT TRUE,
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed default plans
INSERT INTO promotion_plans (name, price_per_day, price_per_week, price_per_month, features)
VALUES
  ('STANDARD', 0.00, 0.00, 0.00, '{
    "direct_contact":     true,
    "unlimited_videos":   true,
    "max_photos":         50,
    "website_link":       false,
    "rotating_banner":    false,
    "promo_tag":          false,
    "emoji_in_title":     false,
    "position":           "standard"
  }'),
  ('PREMIUM', 6.49, 38.94, 155.76, '{
    "direct_contact":     true,
    "unlimited_videos":   true,
    "max_photos":         50,
    "website_link":       true,
    "rotating_banner":    false,
    "promo_tag":          true,
    "emoji_in_title":     false,
    "position":           "above_standard"
  }'),
  ('EXCLUSIVE', 11.95, 71.70, 286.80, '{
    "direct_contact":     true,
    "unlimited_videos":   true,
    "max_photos":         50,
    "website_link":       true,
    "rotating_banner":    true,
    "promo_tag":          true,
    "emoji_in_title":     true,
    "emoji_price_per_day": 1.09,
    "position":           "above_premium"
  }')
ON CONFLICT (name) DO NOTHING;
