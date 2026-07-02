-- Add Dealership table
CREATE TABLE "Dealership" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dealership_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Dealership_organisationId_idx" ON "Dealership"("organisationId");
ALTER TABLE "Dealership" DROP CONSTRAINT IF EXISTS "Dealership_organisationId_fkey";
ALTER TABLE "Dealership" ADD CONSTRAINT "Dealership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add dealershipId to Site
ALTER TABLE "Site" ADD COLUMN "dealershipId" TEXT;
ALTER TABLE "Site" DROP CONSTRAINT IF EXISTS "Site_dealershipId_fkey";
ALTER TABLE "Site" ADD CONSTRAINT "Site_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Expand User fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mobile" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyRate" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyDeductions" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contractComplete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;
