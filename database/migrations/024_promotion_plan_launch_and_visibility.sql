-- Migration 024: launch plan + per-plan availability states + display names.

ALTER TABLE promotion_plans
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20);

UPDATE promotion_plans
SET display_name = CASE name
  WHEN 'STANDARD' THEN 'Standard'
  WHEN 'PREMIUM' THEN 'Destacado'
  WHEN 'EXCLUSIVE' THEN 'Elite'
  ELSE INITCAP(LOWER(name))
END
WHERE display_name IS NULL OR BTRIM(display_name) = '';

UPDATE promotion_plans
SET availability_status = CASE
  WHEN is_active THEN 'AVAILABLE'
  ELSE 'HIDDEN'
END
WHERE availability_status IS NULL OR BTRIM(availability_status) = '';

ALTER TABLE promotion_plans
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN availability_status SET DEFAULT 'AVAILABLE',
  ALTER COLUMN availability_status SET NOT NULL;

ALTER TABLE promotion_plans
  DROP CONSTRAINT IF EXISTS promotion_plans_availability_status_check;

ALTER TABLE promotion_plans
  ADD CONSTRAINT promotion_plans_availability_status_check
  CHECK (availability_status IN ('AVAILABLE', 'COMING_SOON', 'HIDDEN'));

UPDATE promotion_plans
SET features = jsonb_set(COALESCE(features, '{}'::jsonb), '{position}', '"standard"'::jsonb, true)
WHERE name = 'STANDARD';

UPDATE promotion_plans
SET features = jsonb_set(COALESCE(features, '{}'::jsonb), '{position}', '"above_standard"'::jsonb, true)
WHERE name = 'PREMIUM';

UPDATE promotion_plans
SET features = jsonb_set(COALESCE(features, '{}'::jsonb), '{position}', '"above_premium"'::jsonb, true)
WHERE name = 'EXCLUSIVE';

INSERT INTO promotion_plans (
  name,
  display_name,
  price_per_day,
  price_per_week,
  price_per_month,
  features,
  is_active,
  availability_status,
  updated_at
)
VALUES (
  'LAUNCH',
  'Plan Lanzamiento',
  0.00,
  0.00,
  0.00,
  '{
    "direct_contact": true,
    "unlimited_videos": true,
    "max_photos": 50,
    "website_link": true,
    "rotating_banner": false,
    "promo_tag": true,
    "emoji_in_title": false,
    "promo_sticker_price_per_day": 0.35,
    "position": "above_standard"
  }'::jsonb,
  TRUE,
  'COMING_SOON',
  NOW()
)
ON CONFLICT (name) DO NOTHING;

UPDATE promotion_plans
SET is_active = availability_status <> 'HIDDEN',
    updated_at = NOW();

UPDATE advertisements AS ads
SET plan_priority = CASE COALESCE(plans.features->>'position', 'standard')
  WHEN 'above_premium' THEN 3
  WHEN 'above_standard' THEN 2
  WHEN 'standard' THEN 1
  ELSE 0
END
FROM promotion_plans AS plans
WHERE ads.selected_plan = plans.name;

UPDATE advertisements
SET plan_priority = 0
WHERE selected_plan IS NULL;
