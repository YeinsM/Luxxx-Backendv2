const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Normalizes user-entered phone numbers into an E.164-like format.
 * We accept spaces, dashes, dots and parentheses on input, but persist and
 * compare a compact international version so verification state is stable.
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const trimmedPhone = rawPhone.trim();
  if (!trimmedPhone) {
    throw new Error('Phone number is required');
  }

  const strippedPhone = trimmedPhone.replace(/[\s\-().]/g, '');
  const normalizedPhone = strippedPhone.startsWith('00')
    ? `+${strippedPhone.slice(2)}`
    : strippedPhone.startsWith('+')
      ? strippedPhone
      : `+${strippedPhone}`;

  if (!E164_PHONE_REGEX.test(normalizedPhone)) {
    throw new Error('Phone number must include a valid international country code');
  }

  return normalizedPhone;
}

/**
 * Best-effort comparison helper for phone changes. If normalization fails for
 * one of the values, we fall back to a trimmed string comparison so legacy
 * values do not crash update flows.
 */
export function arePhoneNumbersEquivalent(
  currentPhone?: string | null,
  nextPhone?: string | null,
): boolean {
  if (!currentPhone && !nextPhone) return true;
  if (!currentPhone || !nextPhone) return false;

  try {
    return normalizePhoneNumber(currentPhone) === normalizePhoneNumber(nextPhone);
  } catch {
    return currentPhone.trim() === nextPhone.trim();
  }
}

