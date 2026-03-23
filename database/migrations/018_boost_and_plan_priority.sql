-- Migration 018: Boost system + plan priority ordering
-- Adds boosted_until for time-limited position boost and plan_priority for tier ordering.

-- 1. Plan priority: 0=none, 1=STANDARD, 2=PREMIUM, 3=EXCLUSIVE
--    Updated by application when selected_plan changes.
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS plan_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMP WITH TIME ZONE;

-- 2. Backfill plan_priority from existing selected_plan values
UPDATE advertisements
SET plan_priority = CASE
  WHEN selected_plan = 'EXCLUSIVE' THEN 3
  WHEN selected_plan = 'PREMIUM'   THEN 2
  WHEN selected_plan = 'STANDARD'  THEN 1
  ELSE 0
END;

-- 3. Default boost price per day in admin settings
INSERT INTO admin_settings (key, value, updated_at)
VALUES ('boost_price_per_day', '4.99', NOW())
ON CONFLICT (key) DO NOTHING;
