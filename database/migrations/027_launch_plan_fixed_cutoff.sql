-- Migration 027: Launch plan uses a fixed cutoff instead of relative duration.

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
BEGIN
  IF normalized_plan = 'LAUNCH' THEN
    RETURN TIMESTAMPTZ '2026-05-15 23:59:59-04';
  END IF;

  RETURN calculate_advertisement_plan_expiry(duration_type, base_at);
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

  IF normalized_plan <> 'LAUNCH'
     AND normalized_duration NOT IN ('DAY', 'WEEK', 'MONTH') THEN
    RAISE EXCEPTION 'selected_duration must be DAY, WEEK, or MONTH when selected_plan is %', normalized_plan;
  END IF;

  NEW.selected_plan := normalized_plan;
  NEW.selected_duration := CASE
    WHEN normalized_plan = 'LAUNCH' THEN NULL
    WHEN normalized_duration = '' THEN NULL
    ELSE normalized_duration
  END;
  NEW.plan_priority := resolve_advertisement_plan_priority(normalized_plan);

  IF should_refresh_expiry THEN
    NEW.plan_expires_at := resolve_advertisement_plan_expiry(
      normalized_plan,
      normalized_duration,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

UPDATE advertisements
SET selected_duration = NULL,
    plan_expires_at = resolve_advertisement_plan_expiry('LAUNCH', NULL, NOW())
WHERE UPPER(BTRIM(COALESCE(selected_plan, ''))) = 'LAUNCH';

SELECT downgrade_expired_advertisement_plans();
