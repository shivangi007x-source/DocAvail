-- Phase 2: Canonical IST calendar date key & DB-level active slot double-booking prevention
ALTER TABLE "Appointment"
  ADD COLUMN "appointmentDateKey" TEXT;

CREATE INDEX "Appointment_doctorId_appointmentDateKey_status_idx"
  ON "Appointment"("doctorId", "appointmentDateKey", "status");

-- Enforce uniqueness only across active bookings so CANCELLED/REJECTED appointments release the slot
CREATE UNIQUE INDEX "Appointment_active_doctor_date_slot_unique"
  ON "Appointment"("doctorId", "appointmentDateKey", "startTime")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
