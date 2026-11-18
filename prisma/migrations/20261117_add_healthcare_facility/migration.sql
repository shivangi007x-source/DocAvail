-- AlterTable
ALTER TABLE "DoctorProfile" ADD COLUMN     "district" TEXT,
ADD COLUMN     "division" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "HealthcareFacility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "category" TEXT,
    "district" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "tehsil" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contactNumber" TEXT,
    "email" TEXT,
    "emergencyServices" BOOLEAN,
    "operationalStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "operationalVerified" BOOLEAN NOT NULL DEFAULT false,
    "locationVerified" BOOLEAN NOT NULL DEFAULT false,
    "sourceVerified" BOOLEAN NOT NULL DEFAULT false,
    "sourceReference" TEXT NOT NULL,
    "sourceAttribution" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthcareFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorFacilityAffiliation" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "consultationFee" DOUBLE PRECISION,
    "visitingSchedule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorFacilityAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthcareFacility_district_idx" ON "HealthcareFacility"("district");

-- CreateIndex
CREATE INDEX "HealthcareFacility_division_idx" ON "HealthcareFacility"("division");

-- CreateIndex
CREATE INDEX "HealthcareFacility_facilityType_idx" ON "HealthcareFacility"("facilityType");

-- CreateIndex
CREATE INDEX "HealthcareFacility_operationalStatus_idx" ON "HealthcareFacility"("operationalStatus");

-- CreateIndex
CREATE INDEX "DoctorFacilityAffiliation_doctorId_idx" ON "DoctorFacilityAffiliation"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorFacilityAffiliation_facilityId_idx" ON "DoctorFacilityAffiliation"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorFacilityAffiliation_doctorId_facilityId_key" ON "DoctorFacilityAffiliation"("doctorId", "facilityId");

-- CreateIndex
CREATE INDEX "DoctorProfile_district_idx" ON "DoctorProfile"("district");

-- CreateIndex
CREATE INDEX "DoctorProfile_division_idx" ON "DoctorProfile"("division");

-- AddForeignKey
ALTER TABLE "DoctorFacilityAffiliation" ADD CONSTRAINT "DoctorFacilityAffiliation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorFacilityAffiliation" ADD CONSTRAINT "DoctorFacilityAffiliation_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthcareFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

