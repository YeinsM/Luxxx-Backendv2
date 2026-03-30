-- Migration 025: keep promotion plan display names canonical in English.

UPDATE promotion_plans
SET display_name = CASE name
  WHEN 'STANDARD' THEN 'Standard'
  WHEN 'LAUNCH' THEN 'Launch Plan'
  WHEN 'PREMIUM' THEN 'Featured'
  WHEN 'EXCLUSIVE' THEN 'Elite'
  ELSE display_name
END
WHERE name IN ('STANDARD', 'LAUNCH', 'PREMIUM', 'EXCLUSIVE');
