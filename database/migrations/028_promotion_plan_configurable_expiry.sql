-- Migration 028: plan-level configurable expiry managed from admin.

ALTER TABLE promotion_plans
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_promotion_plans_expires_at
  ON promotion_plans (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION resolve_advertisement_plan_expiry(
  plan_name TEXT,
  duration_type TEXT,
  base_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_plan TEXT := UPPER(BTRIM(COALESCE(plan_name, '')));
  configured_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT expires_at
  INTO configured_expiry
  FROM promotion_plans
  WHERE name = normalized_plan
  LIMIT 1;

  IF configured_expiry IS NOT NULL THEN
    RETURN configured_expiry;
  END IF;

  RETURN calculate_advertisement_plan_expiry(duration_type, base_at);
END;
$$;

UPDATE promotion_plans
SET expires_at = TIMESTAMPTZ '2026-05-15 23:59:59-04'
WHERE name = 'LAUNCH'
  AND expires_at IS NULL;

UPDATE advertisements AS ads
SET plan_expires_at = plans.expires_at
FROM promotion_plans AS plans
WHERE ads.selected_plan = plans.name
  AND plans.expires_at IS NOT NULL;

SELECT downgrade_expired_advertisement_plans();
