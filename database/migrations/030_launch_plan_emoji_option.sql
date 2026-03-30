-- Migration 030: add emoji title support to the LAUNCH plan.

WITH launch_emoji_price AS (
  SELECT COALESCE(
    launch.features -> 'emoji_price_per_day',
    (
      SELECT to_jsonb((exclusive.features->>'emoji_price_per_day')::numeric)
      FROM promotion_plans AS exclusive
      WHERE exclusive.name = 'EXCLUSIVE'
        AND exclusive.features ? 'emoji_price_per_day'
      LIMIT 1
    ),
    to_jsonb(1.09::numeric)
  ) AS emoji_price
  FROM promotion_plans AS launch
  WHERE launch.name = 'LAUNCH'
)
UPDATE promotion_plans AS launch
SET features = jsonb_set(
      jsonb_set(
        COALESCE(launch.features, '{}'::jsonb),
        '{emoji_in_title}',
        'true'::jsonb,
        true
      ),
      '{emoji_price_per_day}',
      launch_emoji_price.emoji_price,
      true
    ),
    updated_at = NOW()
FROM launch_emoji_price
WHERE launch.name = 'LAUNCH';
