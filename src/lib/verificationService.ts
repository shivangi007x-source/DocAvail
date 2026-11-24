import { prisma } from '@/lib/prisma';
import { getEmailProvider, getSmsProvider } from '@/lib/messagingProviders';
import { maskEmail, maskPhone, normalizePhoneToE164 } from '@/lib/phone';
import {
  constantTimeEqualHex,
  generateEmailVerificationToken,
  generateSixDigitOtp,
  hashEmailVerificationToken,
  hashPhoneOtp,
} from '@/lib/verificationCrypto';

export const EMAIL_TOKEN_EXPIRY_MINUTES = 30;
export const PHONE_OTP_EXPIRY_MINUTES = 5;
export const RESEND_COOLDOWN_SECONDS = 60;
export const RATE_LIMIT_WINDOW_MINUTES = 15;
export const MAX_SEND_PER_WINDOW = 5;
export const MAX_OTP_VERIFY_ATTEMPTS = 5;

const publicResendIpBuckets = new Map<string, number[]>();

function resolveBaseOrigin(originUrl?: string): string {
  const candidate = originUrl?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
  return candidate.replace(/\/+$/, '');
}

export function checkPublicIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  const existing = (publicResendIpBuckets.get(ip) || []).filter((ts) => now - ts < windowMs);
  if (existing.length >= 12) {
    publicResendIpBuckets.set(ip, existing);
    return false;
  }
  existing.push(now);
  publicResendIpBuckets.set(ip, existing);
  return true;
}

export async function getUserVerificationStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      approvalStatus: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      verificationRequired: true,
      patientProfile: { select: { phone: true } },
      doctorProfile: { select: { phone: true } },
    },
  });

  if (!user) return null;

  const rawPhone =
    user.role === 'DOCTOR' ? user.doctorProfile?.phone || null : user.patientProfile?.phone || null;
  const normalizedPhone = normalizePhoneToE164(rawPhone);
  const now = Date.now();

  const [latestEmailToken, latestPhoneOtp] = await Promise.all([
    prisma.emailVerificationToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.phoneVerificationOtp.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, phoneE164: true, expiresAt: true, consumedAt: true, invalidatedAt: true, attempts: true, maxAttempts: true },
    }),
  ]);

  const emailElapsedSec = latestEmailToken
    ? Math.floor((now - latestEmailToken.createdAt.getTime()) / 1000)
    : RESEND_COOLDOWN_SECONDS;
  const phoneElapsedSec = latestPhoneOtp
    ? Math.floor((now - latestPhoneOtp.createdAt.getTime()) / 1000)
    : RESEND_COOLDOWN_SECONDS;

  const emailCooldownSeconds = Math.max(0, RESEND_COOLDOWN_SECONDS - emailElapsedSec);
  const phoneCooldownSeconds = Math.max(0, RESEND_COOLDOWN_SECONDS - phoneElapsedSec);

  const isEmailVerified = Boolean(user.emailVerifiedAt);
  const isPhoneVerified = Boolean(user.phoneVerifiedAt);
  const isFullyVerified = isEmailVerified && isPhoneVerified;
  const hasActiveOtp = Boolean(
    latestPhoneOtp &&
      !latestPhoneOtp.consumedAt &&
      !latestPhoneOtp.invalidatedAt &&
      latestPhoneOtp.expiresAt.getTime() > now &&
      latestPhoneOtp.attempts < latestPhoneOtp.maxAttempts
  );

  return {
    email: user.email,
    emailMasked: maskEmail(user.email),
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    isEmailVerified,
    phone: normalizedPhone || rawPhone || null,
    phoneMasked: maskPhone(normalizedPhone || rawPhone),
    phoneVerifiedAt: user.phoneVerifiedAt ? user.phoneVerifiedAt.toISOString() : null,
    isPhoneVerified,
    isFullyVerified,
    verificationRequired: user.verificationRequired,
    approvalStatus: user.approvalStatus,
    emailCooldownSeconds,
    phoneCooldownSeconds,
    hasActiveOtp,
    activeOtpExpiresAt: hasActiveOtp && latestPhoneOtp ? latestPhoneOtp.expiresAt.toISOString() : null,
  };
}

export type SendEmailVerificationResult =
  | {
      ok: true;
      alreadyVerified?: boolean;
      deliveryMode: string;
      expiresAt?: string;
      cooldownSeconds: number;
      message: string;
    }
  | { ok: false; status: number; code: string; retryAfterSeconds?: number; error: string };

export async function issueEmailVerificationForUser(
  userId: string,
  options: { skipCooldown?: boolean; originUrl?: string } = {}
): Promise<SendEmailVerificationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true },
  });

  if (!user) {
    return { ok: false, status: 404, code: 'USER_NOT_FOUND', error: 'Account not found.' };
  }

  if (user.emailVerifiedAt) {
    return {
      ok: true,
      alreadyVerified: true,
      deliveryMode: 'none',
      cooldownSeconds: 0,
      message: 'Your email address is already verified.',
    };
  }

  const now = new Date();
  if (!options.skipCooldown) {
    const latest = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (latest) {
      const elapsedSec = Math.floor((now.getTime() - latest.createdAt.getTime()) / 1000);
      if (elapsedSec < RESEND_COOLDOWN_SECONDS) {
        const retryAfterSeconds = RESEND_COOLDOWN_SECONDS - elapsedSec;
        return {
          ok: false,
          status: 429,
          code: 'EMAIL_COOLDOWN',
          retryAfterSeconds,
          error: `Please wait ${retryAfterSeconds} seconds before requesting another verification email.`,
        };
      }
    }

    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentCount = await prisma.emailVerificationToken.count({
      where: { userId: user.id, createdAt: { gte: windowStart } },
    });
    if (recentCount >= MAX_SEND_PER_WINDOW) {
      return {
        ok: false,
        status: 429,
        code: 'EMAIL_RATE_LIMITED',
        error: 'Too many email verification requests. Please try again later.',
      };
    }
  }

  const rawToken = generateEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(rawToken);
  const expiresAt = new Date(now.getTime() + EMAIL_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  const createdToken = await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
    },
    select: { id: true },
  });

  const verificationUrl = `${resolveBaseOrigin(options.originUrl)}/verify-email?token=${encodeURIComponent(
    rawToken
  )}`;
  const delivery = await getEmailProvider().sendVerificationEmail({
    toEmail: user.email,
    recipientName: user.name,
    verificationUrl,
    expiresMinutes: EMAIL_TOKEN_EXPIRY_MINUTES,
  });

  if (!delivery.delivered) {
    await prisma.emailVerificationToken.delete({ where: { id: createdToken.id } }).catch(() => {});
    return {
      ok: false,
      status: delivery.mode === 'unconfigured' ? 503 : 502,
      code: delivery.mode === 'unconfigured' ? 'DELIVERY_PROVIDER_UNCONFIGURED' : 'EMAIL_DELIVERY_FAILED',
      error: delivery.error || 'Failed to deliver verification email.',
    };
  }

  return {
    ok: true,
    deliveryMode: delivery.mode,
    expiresAt: expiresAt.toISOString(),
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    message:
      delivery.mode === 'local_dev_outbox'
        ? 'Verification email recorded in local development outbox. Configure RESEND_API_KEY and EMAIL_FROM for live email delivery.'
        : 'Verification link sent to your registered email address.',
  };
}

export async function verifyEmailWithToken(rawToken?: string | null) {
  const trimmed = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!trimmed || trimmed.length < 16) {
    return {
      ok: false as const,
      status: 400,
      code: 'INVALID_TOKEN',
      error: 'Verification link is invalid or incomplete.',
    };
  }

  const tokenHash = hashEmailVerificationToken(trimmed);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      email: true,
      expiresAt: true,
      consumedAt: true,
      user: { select: { email: true, emailVerifiedAt: true } },
    },
  });

  if (!record) {
    return {
      ok: false as const,
      status: 400,
      code: 'INVALID_TOKEN',
      error: 'Verification link is invalid.',
    };
  }

  if (record.consumedAt) {
    return {
      ok: false as const,
      status: 400,
      code: 'TOKEN_ALREADY_USED',
      error: 'This verification link has already been used.',
    };
  }

  const now = new Date();
  if (record.expiresAt.getTime() <= now.getTime()) {
    return {
      ok: false as const,
      status: 400,
      code: 'TOKEN_EXPIRED',
      error: 'This verification link has expired. Please request a new verification email.',
    };
  }

  if (record.email.toLowerCase() !== record.user.email.toLowerCase()) {
    return {
      ok: false as const,
      status: 400,
      code: 'EMAIL_CHANGED',
      error: 'Account email address has changed since this link was issued.',
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.emailVerificationToken.updateMany({
      where: {
        id: record.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        consumedAt: now,
        attempts: { increment: 1 },
      },
    });

    if (consumed.count !== 1) {
      return null;
    }

    const updatedUser = await tx.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: record.user.emailVerifiedAt || now,
      },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

    // Mark any older unconsumed tokens for this user as consumed to prevent reuse
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: record.userId,
        consumedAt: null,
      },
      data: { consumedAt: now },
    });

    return updatedUser;
  });

  if (!result) {
    return {
      ok: false as const,
      status: 400,
      code: 'TOKEN_ALREADY_USED',
      error: 'This verification link has already been used.',
    };
  }

  return {
    ok: true as const,
    email: result.email,
    emailVerifiedAt: result.emailVerifiedAt?.toISOString() || now.toISOString(),
    message: 'Your email address has been verified successfully.',
  };
}

export type SendPhoneOtpResult =
  | {
      ok: true;
      phoneE164: string;
      phoneMasked: string;
      expiresAt: string;
      cooldownSeconds: number;
      deliveryMode: string;
      message: string;
    }
  | { ok: false; status: number; code: string; retryAfterSeconds?: number; error: string };

export async function sendPhoneVerificationOtp(
  userId: string,
  rawPhone?: string | null
): Promise<SendPhoneOtpResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      phoneVerifiedAt: true,
      patientProfile: { select: { id: true, phone: true } },
      doctorProfile: { select: { id: true, phone: true } },
    },
  });

  if (!user) {
    return { ok: false, status: 404, code: 'USER_NOT_FOUND', error: 'Account not found.' };
  }

  const profilePhone =
    user.role === 'DOCTOR' ? user.doctorProfile?.phone || null : user.patientProfile?.phone || null;

  const targetPhoneInput =
    typeof rawPhone === 'string' && rawPhone.trim() !== '' ? rawPhone.trim() : profilePhone;

  if (!targetPhoneInput) {
    return {
      ok: false,
      status: 400,
      code: 'PHONE_REQUIRED',
      error: 'Please enter a valid mobile number (e.g. +91 9876543210).',
    };
  }

  const phoneE164 = normalizePhoneToE164(targetPhoneInput);
  if (!phoneE164) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_PHONE_FORMAT',
      error: 'Please enter a valid Indian (+91) or E.164 phone number.',
    };
  }

  const existingNormalized = normalizePhoneToE164(profilePhone);
  if (user.phoneVerifiedAt && existingNormalized === phoneE164) {
    return {
      ok: false,
      status: 400,
      code: 'PHONE_ALREADY_VERIFIED',
      error: 'This phone number is already verified.',
    };
  }

  const now = new Date();
  const latestOtp = await prisma.phoneVerificationOtp.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (latestOtp) {
    const elapsedSec = Math.floor((now.getTime() - latestOtp.createdAt.getTime()) / 1000);
    if (elapsedSec < RESEND_COOLDOWN_SECONDS) {
      const retryAfterSeconds = RESEND_COOLDOWN_SECONDS - elapsedSec;
      return {
        ok: false,
        status: 429,
        code: 'OTP_COOLDOWN',
        retryAfterSeconds,
        error: `Please wait ${retryAfterSeconds} seconds before requesting another OTP.`,
      };
    }
  }

  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const recentCount = await prisma.phoneVerificationOtp.count({
    where: { userId: user.id, createdAt: { gte: windowStart } },
  });
  if (recentCount >= MAX_SEND_PER_WINDOW) {
    return {
      ok: false,
      status: 429,
      code: 'OTP_RATE_LIMITED',
      error: 'Too many OTP requests. Please wait before trying again.',
    };
  }

  // If authenticated user supplied a different phone number, bind it to their own profile & clear prior phone verification
  if (rawPhone && rawPhone.trim() !== '' && existingNormalized !== phoneE164) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { phoneVerifiedAt: null },
      });
      if (user.role === 'DOCTOR' && user.doctorProfile) {
        await tx.doctorProfile.update({
          where: { userId: user.id },
          data: { phone: phoneE164 },
        });
      } else if (user.role === 'PATIENT') {
        await tx.patientProfile.upsert({
          where: { userId: user.id },
          update: { phone: phoneE164 },
          create: { userId: user.id, phone: phoneE164 },
        });
      }
    });
  }

  const otp = generateSixDigitOtp();
  const otpHash = hashPhoneOtp(user.id, phoneE164, otp);
  const expiresAt = new Date(now.getTime() + PHONE_OTP_EXPIRY_MINUTES * 60 * 1000);

  const createdOtp = await prisma.$transaction(async (tx) => {
    await tx.phoneVerificationOtp.updateMany({
      where: {
        userId: user.id,
        consumedAt: null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: now },
    });

    return tx.phoneVerificationOtp.create({
      data: {
        userId: user.id,
        phoneE164,
        otpHash,
        expiresAt,
        maxAttempts: MAX_OTP_VERIFY_ATTEMPTS,
      },
      select: { id: true },
    });
  });

  const delivery = await getSmsProvider().sendVerificationOtp({
    toPhoneE164: phoneE164,
    recipientName: user.name,
    otp,
    expiresMinutes: PHONE_OTP_EXPIRY_MINUTES,
  });

  if (!delivery.delivered) {
    await prisma.phoneVerificationOtp.delete({ where: { id: createdOtp.id } }).catch(() => {});
    return {
      ok: false,
      status: delivery.mode === 'unconfigured' ? 503 : 502,
      code: delivery.mode === 'unconfigured' ? 'DELIVERY_PROVIDER_UNCONFIGURED' : 'SMS_DELIVERY_FAILED',
      error: delivery.error || 'Failed to send verification OTP.',
    };
  }

  const masked = maskPhone(phoneE164) || phoneE164;

  return {
    ok: true,
    phoneE164,
    phoneMasked: masked,
    expiresAt: expiresAt.toISOString(),
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    deliveryMode: delivery.mode,
    message:
      delivery.mode === 'local_dev_outbox'
        ? `6-digit OTP recorded in local dev outbox for ${masked}. Configure Twilio credentials for live SMS.`
        : `A 6-digit verification code has been sent to ${masked}.`,
  };
}

export async function verifyPhoneOtpForUser(
  userId: string,
  rawOtp?: string | null,
  rawPhone?: string | null
) {
  const otp = typeof rawOtp === 'string' ? rawOtp.trim() : '';
  if (!/^\d{6}$/.test(otp)) {
    return {
      ok: false as const,
      status: 400,
      code: 'INVALID_OTP_FORMAT',
      error: 'Please enter a valid 6-digit numeric OTP.',
    };
  }

  const latestOtp = await prisma.phoneVerificationOtp.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      phoneE164: true,
      otpHash: true,
      expiresAt: true,
      consumedAt: true,
      invalidatedAt: true,
      attempts: true,
      maxAttempts: true,
      user: { select: { role: true, doctorProfile: { select: { id: true } } } },
    },
  });

  if (!latestOtp) {
    return {
      ok: false as const,
      status: 400,
      code: 'OTP_NOT_FOUND',
      error: 'No active OTP was found. Please request a verification code first.',
    };
  }

  if (latestOtp.consumedAt) {
    return {
      ok: false as const,
      status: 400,
      code: 'OTP_ALREADY_USED',
      error: 'This OTP has already been used. Please request a new code if needed.',
    };
  }

  if (latestOtp.invalidatedAt) {
    return {
      ok: false as const,
      status: 400,
      code: 'OTP_INVALIDATED',
      error: 'This OTP is no longer active. Please request a new verification code.',
    };
  }

  const now = new Date();
  if (latestOtp.expiresAt.getTime() <= now.getTime()) {
    return {
      ok: false as const,
      status: 400,
      code: 'OTP_EXPIRED',
      error: 'This verification code has expired. Please request a new OTP.',
    };
  }

  if (latestOtp.attempts >= latestOtp.maxAttempts) {
    await prisma.phoneVerificationOtp.update({
      where: { id: latestOtp.id },
      data: { invalidatedAt: now },
    });
    return {
      ok: false as const,
      status: 429,
      code: 'OTP_MAX_ATTEMPTS',
      error: 'Maximum OTP verification attempts exceeded. Please request a new OTP.',
    };
  }

  if (typeof rawPhone === 'string' && rawPhone.trim() !== '') {
    const requestedE164 = normalizePhoneToE164(rawPhone);
    if (!requestedE164 || requestedE164 !== latestOtp.phoneE164) {
      return {
        ok: false as const,
        status: 400,
        code: 'PHONE_MISMATCH',
        error: 'Phone number does not match the number the OTP was sent to.',
      };
    }
  }

  const candidateHash = hashPhoneOtp(userId, latestOtp.phoneE164, otp);
  if (!constantTimeEqualHex(candidateHash, latestOtp.otpHash)) {
    const nextAttempts = latestOtp.attempts + 1;
    const hitLimit = nextAttempts >= latestOtp.maxAttempts;

    await prisma.phoneVerificationOtp.update({
      where: { id: latestOtp.id },
      data: {
        attempts: { increment: 1 },
        ...(hitLimit ? { invalidatedAt: now } : {}),
      },
    });

    if (hitLimit) {
      return {
        ok: false as const,
        status: 429,
        code: 'OTP_MAX_ATTEMPTS',
        remainingAttempts: 0,
        error: 'Too many incorrect OTP attempts. Please request a new verification code.',
      };
    }

    const remainingAttempts = latestOtp.maxAttempts - nextAttempts;
    return {
      ok: false as const,
      status: 400,
      code: 'INVALID_OTP',
      remainingAttempts,
      error: `Incorrect OTP code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
    };
  }

  const verifiedUser = await prisma.$transaction(async (tx) => {
    const consumed = await tx.phoneVerificationOtp.updateMany({
      where: {
        id: latestOtp.id,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: latestOtp.maxAttempts },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) {
      return null;
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: now },
      select: { id: true, phoneVerifiedAt: true },
    });

    if (latestOtp.user.role === 'DOCTOR' && latestOtp.user.doctorProfile) {
      await tx.doctorProfile.update({
        where: { userId },
        data: { phone: latestOtp.phoneE164 },
      });
    } else if (latestOtp.user.role === 'PATIENT') {
      await tx.patientProfile.upsert({
        where: { userId },
        update: { phone: latestOtp.phoneE164 },
        create: { userId, phone: latestOtp.phoneE164 },
      });
    }

    return updated;
  });

  if (!verifiedUser) {
    return {
      ok: false as const,
      status: 400,
      code: 'OTP_ALREADY_USED',
      error: 'This OTP has already been consumed. Please request a new code.',
    };
  }

  return {
    ok: true as const,
    phoneE164: latestOtp.phoneE164,
    phoneMasked: maskPhone(latestOtp.phoneE164) || latestOtp.phoneE164,
    phoneVerifiedAt: verifiedUser.phoneVerifiedAt?.toISOString() || now.toISOString(),
    message: 'Phone number verified successfully.',
  };
}
