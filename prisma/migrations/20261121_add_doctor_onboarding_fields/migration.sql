-- Additive nullable onboarding fields on DoctorProfile (zero impact on existing records)
ALTER TABLE "DoctorProfile"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "verificationDocName" TEXT,
  ADD COLUMN "verificationDocMime" TEXT,
  ADD COLUMN "verificationDocSize" INTEGER,
  ADD COLUMN "verificationDocContent" BYTEA;
