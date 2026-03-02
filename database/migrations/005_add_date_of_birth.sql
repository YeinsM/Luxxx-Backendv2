-- Migration 005: Replace age with date_of_birth for escorts
-- Adds date_of_birth column and keeps age as a computed/stored integer for backward compatibility

-- Add date_of_birth column
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Populate date_of_birth from existing age (approximate: subtract age years from now, set Jan 1)
-- This is a best-effort migration; real birthdate will be set on next escort registration
UPDATE users
SET date_of_birth = (DATE_TRUNC('year', NOW()) - (age || ' years')::INTERVAL)::DATE
WHERE user_type = 'escort' AND age IS NOT NULL AND date_of_birth IS NULL;

-- Drop the old age NOT NULL constraint by relaxing the escort_fields check
-- (age will now be computed from date_of_birth on insert/update by the application layer)
ALTER TABLE users DROP CONSTRAINT IF EXISTS escort_fields;
ALTER TABLE users ADD CONSTRAINT escort_fields CHECK (
  user_type != 'escort' OR (name IS NOT NULL AND phone IS NOT NULL AND city IS NOT NULL AND date_of_birth IS NOT NULL)
);

-- Drop old valid_age constraint (age is now computed, not user-supplied)
ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_age;

-- Create index for date_of_birth
CREATE INDEX IF NOT EXISTS idx_users_date_of_birth ON users(date_of_birth);
