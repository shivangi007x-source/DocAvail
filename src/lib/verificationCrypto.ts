import crypto from 'node:crypto';

function getVerificationSecret(): string {
  return (
    process.env.VERIFICATION_HASH_SECRET ||
    process.env.JWT_SECRET ||
    'docavail-local-verification-fallback-secret'
  );
}

export function generateEmailVerificationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashEmailVerificationToken(rawToken: string): string {
  return crypto
    .createHmac('sha256', getVerificationSecret())
    .update(`email:${rawToken}`)
    .digest('hex');
}

export function generateSixDigitOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashPhoneOtp(userId: string, phoneE164: string, otp: string): string {
  return crypto
    .createHmac('sha256', getVerificationSecret())
    .update(`phone:${userId}:${phoneE164}:${otp}`)
    .digest('hex');
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}
