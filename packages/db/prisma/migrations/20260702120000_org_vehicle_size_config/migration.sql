-- CreateTable OrgVehicleSizeConfig
CREATE TABLE IF NOT EXISTS "OrgVehicleSizeConfig" (
    "id"             TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "size"           "VehicleSize" NOT NULL,
    "basePricePence" INTEGER,
    "baseAllocMins"  INTEGER,
    "deltaPricePence" INTEGER NOT NULL DEFAULT 0,
    "deltaMins"      INTEGER NOT NULL DEFAULT 0,
    "label"          TEXT,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgVehicleSizeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrgVehicleSizeConfig_organisationId_size_key" ON "OrgVehicleSizeConfig"("organisationId", "size");
CREATE INDEX IF NOT EXISTS "OrgVehicleSizeConfig_organisationId_idx" ON "OrgVehicleSizeConfig"("organisationId");

-- AlterTable: add resolved fields to Booking
ALTER TABLE "Booking"
    ADD COLUMN IF NOT EXISTS "resolvedPricePence"   INTEGER,
    ADD COLUMN IF NOT EXISTS "resolvedDurationMins" INTEGER;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'OrgVehicleSizeConfig_organisationId_fkey'
    ) THEN
        ALTER TABLE "OrgVehicleSizeConfig"
            ADD CONSTRAINT "OrgVehicleSizeConfig_organisationId_fkey"
            FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
