-- Phase 4: Email Verification Tokens & Phone Verification OTPs
ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "verificationRequired" BOOLEAN NOT NULL DEFAULT true;

-- Grandfather pre-Phase-4 accounts so existing users are never locked out unexpectedly
-- while keeping emailVerifiedAt / phoneVerifiedAt NULL until explicitly verified.
UPDATE "User"
  SET "verificationRequired" = false
  WHERE "verificationRequired" = true;

CREATE TABLE "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key"
  ON "EmailVerificationToken"("tokenHash");

CREATE INDEX "EmailVerificationToken_userId_createdAt_idx"
  ON "EmailVerificationToken"("userId", "createdAt");

CREATE INDEX "EmailVerificationToken_expiresAt_idx"
  ON "EmailVerificationToken"("expiresAt");

ALTER TABLE "EmailVerificationToken"
  ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PhoneVerificationOtp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phoneE164" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PhoneVerificationOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhoneVerificationOtp_userId_createdAt_idx"
  ON "PhoneVerificationOtp"("userId", "createdAt");

CREATE INDEX "PhoneVerificationOtp_userId_phoneE164_idx"
  ON "PhoneVerificationOtp"("userId", "phoneE164");

CREATE INDEX "PhoneVerificationOtp_expiresAt_idx"
  ON "PhoneVerificationOtp"("expiresAt");

ALTER TABLE "PhoneVerificationOtp"
  ADD CONSTRAINT "PhoneVerificationOtp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
