-- Migration 026: automatic advertisement plan expiry + downgrade job.
-- Guarantees paid plans expire automatically and return to STANDARD.

CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_advertisements_plan_expires_at
  ON advertisements (plan_expires_at)
  WHERE plan_expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION calculate_advertisement_plan_expiry(
  duration_type TEXT,
  base_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_duration TEXT := UPPER(BTRIM(COALESCE(duration_type, '')));
BEGIN
  CASE normalized_duration
    WHEN 'DAY' THEN
      RETURN base_at + INTERVAL '1 day';
    WHEN 'WEEK' THEN
      RETURN base_at + INTERVAL '7 days';
    WHEN 'MONTH' THEN
      RETURN base_at + INTERVAL '30 days';
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_advertisement_plan_priority(plan_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_plan TEXT := UPPER(BTRIM(COALESCE(plan_name, '')));
  position_value TEXT;
BEGIN
  IF normalized_plan = '' OR normalized_plan = 'STANDARD' THEN
    RETURN 1;
  END IF;

  SELECT LOWER(COALESCE(features->>'position', ''))
  INTO position_value
  FROM promotion_plans
  WHERE name = normalized_plan
  LIMIT 1;

  IF position_value = 'above_premium' THEN
    RETURN 3;
  END IF;

  IF position_value = 'above_standard' THEN
    RETURN 2;
  END IF;

  IF position_value = 'standard' THEN
    RETURN 1;
  END IF;

  IF normalized_plan = 'EXCLUSIVE' THEN
    RETURN 3;
  END IF;

  IF normalized_plan = 'PREMIUM' THEN
    RETURN 2;
  END IF;

  IF normalized_plan = 'LAUNCH' THEN
    RETURN 1;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION sync_advertisement_plan_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_plan TEXT := UPPER(BTRIM(COALESCE(NEW.selected_plan, '')));
  normalized_duration TEXT := UPPER(BTRIM(COALESCE(NEW.selected_duration, '')));
  old_plan TEXT := '';
  old_duration TEXT := '';
  should_refresh_expiry BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_plan := UPPER(BTRIM(COALESCE(OLD.selected_plan, '')));
    old_duration := UPPER(BTRIM(COALESCE(OLD.selected_duration, '')));
  END IF;

  should_refresh_expiry := TG_OP = 'INSERT'
    OR COALESCE(TG_ARGV[0], '') = 'addons_update'
    OR old_plan IS DISTINCT FROM normalized_plan
    OR old_duration IS DISTINCT FROM normalized_duration;

  IF normalized_plan = '' OR normalized_plan = 'STANDARD' THEN
    NEW.selected_plan := 'STANDARD';
    NEW.selected_duration := NULL;
    NEW.selected_addons := ARRAY[]::TEXT[];
    NEW.promo_sticker := NULL;
    NEW.plan_priority := resolve_advertisement_plan_priority('STANDARD');
    NEW.plan_expires_at := NULL;
    RETURN NEW;
  END IF;

  IF normalized_duration NOT IN ('DAY', 'WEEK', 'MONTH') THEN
    RAISE EXCEPTION 'selected_duration must be DAY, WEEK, or MONTH when selected_plan is %', normalized_plan;
  END IF;

  NEW.selected_plan := normalized_plan;
  NEW.selected_duration := normalized_duration;
  NEW.plan_priority := resolve_advertisement_plan_priority(normalized_plan);

  IF should_refresh_expiry THEN
    NEW.plan_expires_at := calculate_advertisement_plan_expiry(normalized_duration, NOW());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_advertisements_sync_plan_subscription ON advertisements;
CREATE TRIGGER trg_advertisements_sync_plan_subscription
  BEFORE INSERT OR UPDATE OF selected_plan, selected_duration
  ON advertisements
  FOR EACH ROW
  EXECUTE FUNCTION sync_advertisement_plan_subscription('plan_change');

DROP TRIGGER IF EXISTS trg_advertisements_refresh_plan_expiry_from_addons ON advertisements;
CREATE TRIGGER trg_advertisements_refresh_plan_expiry_from_addons
  BEFORE UPDATE OF selected_addons
  ON advertisements
  FOR EACH ROW
  EXECUTE FUNCTION sync_advertisement_plan_subscription('addons_update');

CREATE OR REPLACE FUNCTION downgrade_expired_advertisement_plans()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  downgraded_count INTEGER := 0;
BEGIN
  WITH downgraded AS (
    UPDATE advertisements
    SET selected_plan = 'STANDARD',
        selected_duration = NULL,
        selected_addons = ARRAY[]::TEXT[],
        promo_sticker = NULL,
        plan_priority = resolve_advertisement_plan_priority('STANDARD'),
        plan_expires_at = NULL
    WHERE plan_expires_at IS NOT NULL
      AND plan_expires_at <= NOW()
      AND UPPER(BTRIM(COALESCE(selected_plan, ''))) <> 'STANDARD'
    RETURNING id
  )
  SELECT COUNT(*) INTO downgraded_count
  FROM downgraded;

  RETURN downgraded_count;
END;
$$;

UPDATE advertisements
SET selected_plan = 'STANDARD',
    selected_duration = NULL,
    selected_addons = ARRAY[]::TEXT[],
    plan_priority = resolve_advertisement_plan_priority('STANDARD'),
    plan_expires_at = NULL
WHERE COALESCE(BTRIM(selected_plan), '') = '';

UPDATE advertisements AS ads
SET plan_expires_at = promotions.end_date
FROM advertisement_promotions AS promotions
WHERE promotions.advertisement_id = ads.id
  AND promotions.end_date IS NOT NULL
  AND ads.plan_expires_at IS NULL
  AND UPPER(BTRIM(COALESCE(ads.selected_plan, ''))) <> 'STANDARD';

SELECT downgrade_expired_advertisement_plans();

SELECT cron.schedule(
  'downgrade-expired-advertisement-plans',
  '* * * * *',
  $$SELECT downgrade_expired_advertisement_plans();$$
);
