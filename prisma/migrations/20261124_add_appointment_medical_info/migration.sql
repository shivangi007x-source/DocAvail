-- Additive nullable appointment medical intake fields (preserves existing Appointment records)
ALTER TABLE "Appointment"
  ADD COLUMN "symptoms" TEXT,
  ADD COLUMN "existingConditions" TEXT,
  ADD COLUMN "currentMedications" TEXT,
  ADD COLUMN "knownAllergies" TEXT;
