-- Add budgetLimit, parkingLat, parkingLng, parkingConfirmedAt to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "budgetLimit" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "parkingLat" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "parkingLng" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "parkingConfirmedAt" TIMESTAMP(3);

-- Add saturdayHalfDay to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "saturdayHalfDay" BOOLEAN NOT NULL DEFAULT false;

-- Create ValeterAccident table
CREATE TABLE IF NOT EXISTS "ValeterAccident" (
  "id" TEXT NOT NULL,
  "valeterId" TEXT NOT NULL,
  "incidentDate" TIMESTAMP(3) NOT NULL,
  "vehicleReg" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "excessAmount" DOUBLE PRECISION NOT NULL DEFAULT 1000,
  "weeklyDeduction" DOUBLE PRECISION,
  "totalDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "settled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ValeterAccident_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ValeterAccident_valeterId_idx" ON "ValeterAccident"("valeterId");
CREATE INDEX IF NOT EXISTS "ValeterAccident_incidentDate_idx" ON "ValeterAccident"("incidentDate");
ALTER TABLE "ValeterAccident" ADD CONSTRAINT "ValeterAccident_valeterId_fkey"
  FOREIGN KEY ("valeterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
