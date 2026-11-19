-- Add User approval workflow columns safely, preserving existing active accounts as APPROVED
-- while setting the column default for all new registrations to PENDING.
ALTER TABLE "User"
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "rejectionReason" TEXT;

-- Sync any existing DoctorProfile rows with PENDING or REJECTED verificationStatus onto their User record
UPDATE "User" u
SET "approvalStatus" = dp."verificationStatus"
FROM "DoctorProfile" dp
WHERE dp."userId" = u."id"
  AND dp."verificationStatus" IN ('PENDING', 'REJECTED');

-- Record baseline approvedAt for existing APPROVED accounts
UPDATE "User"
SET "approvedAt" = "createdAt"
WHERE "approvalStatus" = 'APPROVED' AND "approvedAt" IS NULL;

-- Set default for all subsequent inserts to PENDING
ALTER TABLE "User" ALTER COLUMN "approvalStatus" SET DEFAULT 'PENDING';

-- Index for fast Admin Dashboard filtering
CREATE INDEX "User_approvalStatus_idx" ON "User"("approvalStatus");
