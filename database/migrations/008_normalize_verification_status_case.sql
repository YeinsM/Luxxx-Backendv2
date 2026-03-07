-- Normalize verification_status to uppercase to match the app's enum values
UPDATE advertisements
SET verification_status = UPPER(verification_status)
WHERE verification_status != UPPER(verification_status);
