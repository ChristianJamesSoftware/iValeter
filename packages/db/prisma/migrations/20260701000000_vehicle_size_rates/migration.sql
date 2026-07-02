-- CreateEnum
CREATE TYPE "VehicleSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'XL', 'VAN');

-- AlterTable: add vehicleSize to Booking (optional — existing rows default to NULL)
ALTER TABLE "Booking" ADD COLUMN "vehicleSize" "VehicleSize";

-- CreateTable: VehicleSizeRate
-- Per-site, per-service-type size modifiers.
-- MEDIUM is the baseline (pctMedium = 0). Other sizes are % relative to Medium.
CREATE TABLE "VehicleSizeRate" (
    "id"              TEXT NOT NULL,
    "siteId"          TEXT NOT NULL,
    "serviceTypeId"   TEXT NOT NULL,
    "basePricePence"  INTEGER,
    "baseAllocMins"   INTEGER,
    "pctSmall"        INTEGER NOT NULL DEFAULT -10,
    "pctMedium"       INTEGER NOT NULL DEFAULT 0,
    "pctLarge"        INTEGER NOT NULL DEFAULT 20,
    "pctXL"           INTEGER NOT NULL DEFAULT 35,
    "pctVan"          INTEGER NOT NULL DEFAULT 50,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleSizeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleSizeRate_siteId_idx" ON "VehicleSizeRate"("siteId");
CREATE INDEX "VehicleSizeRate_serviceTypeId_idx" ON "VehicleSizeRate"("serviceTypeId");
CREATE UNIQUE INDEX "VehicleSizeRate_siteId_serviceTypeId_key" ON "VehicleSizeRate"("siteId", "serviceTypeId");

-- AddForeignKey
ALTER TABLE "VehicleSizeRate" DROP CONSTRAINT IF EXISTS "VehicleSizeRate_siteId_fkey";
ALTER TABLE "VehicleSizeRate" ADD CONSTRAINT "VehicleSizeRate_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VehicleSizeRate" DROP CONSTRAINT IF EXISTS "VehicleSizeRate_serviceTypeId_fkey";
ALTER TABLE "VehicleSizeRate" ADD CONSTRAINT "VehicleSizeRate_serviceTypeId_fkey"
    FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
