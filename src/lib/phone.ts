/**
 * Phone number normalization (E.164 with Indian +91 support) and masking helpers.
 */

const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const INDIAN_MOBILE_10_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalizes Indian or international phone numbers into strict E.164 format (e.g. "+919876543210").
 * Returns null if the input cannot represent a valid E.164 phone number.
 */
export function normalizePhoneToE164(raw?: string | null): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/[\s().-]+/g, '');
  if (!cleaned) return null;

  // Case 1: 10-digit Indian mobile number (e.g. 9876543210)
  if (INDIAN_MOBILE_10_REGEX.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // Case 2: Leading zero Indian mobile number (e.g. 09876543210)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // Case 3: Country code 91 without '+' (e.g. 919876543210)
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Case 4: International E.164 with '+'
  if (cleaned.startsWith('+')) {
    if (cleaned.startsWith('+91')) {
      const national = cleaned.slice(3);
      return INDIAN_MOBILE_10_REGEX.test(national) ? `+91${national}` : null;
    }
    return E164_REGEX.test(cleaned) ? cleaned : null;
  }

  return null;
}

export function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return '****';
  const visibleTail = trimmed.slice(-4);
  const prefix = trimmed.startsWith('+91') ? '+91 ' : trimmed.startsWith('+') ? '+' : '';
  const maskedCount = Math.max(4, trimmed.length - visibleTail.length - prefix.replace(/\s/g, '').length);
  return `${prefix}${'*'.repeat(maskedCount)}${visibleTail}`;
}

export function maskEmail(email?: string | null): string | null {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${'*'.repeat(Math.max(2, local.length - head.length))}@${domain}`;
}
