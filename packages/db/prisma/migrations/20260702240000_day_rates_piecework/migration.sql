-- Add piecework flag and default piece rate to valet library
ALTER TABLE "Dealership" ADD COLUMN "pieceworkEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ValetTypeTemplate" ADD COLUMN "defaultPieceRatePence" INTEGER;

-- Add day rate roles table (platform defaults seeded below)
CREATE TABLE "DayRateRole" (
  "id"             TEXT NOT NULL,
  "organisationId" TEXT,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DayRateRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DayRateRole_organisationId_name_key" ON "DayRateRole"("organisationId", "name");
CREATE INDEX "DayRateRole_organisationId_idx" ON "DayRateRole"("organisationId");

-- Add dealership day rates table
CREATE TABLE "DealershipDayRate" (
  "id"           TEXT NOT NULL,
  "dealershipId" TEXT NOT NULL,
  "roleId"       TEXT NOT NULL,
  "ratePence"    INTEGER NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DealershipDayRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DealershipDayRate_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DealershipDayRate_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "DayRateRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DealershipDayRate_dealershipId_roleId_key" ON "DealershipDayRate"("dealershipId", "roleId");
CREATE INDEX "DealershipDayRate_dealershipId_idx" ON "DealershipDayRate"("dealershipId");

-- Add dealership piece rate overrides table
CREATE TABLE "DealershipPieceRate" (
  "id"           TEXT NOT NULL,
  "dealershipId" TEXT NOT NULL,
  "valetTypeId"  TEXT NOT NULL,
  "ratePence"    INTEGER NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DealershipPieceRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DealershipPieceRate_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DealershipPieceRate_dealershipId_valetTypeId_key" ON "DealershipPieceRate"("dealershipId", "valetTypeId");
CREATE INDEX "DealershipPieceRate_dealershipId_idx" ON "DealershipPieceRate"("dealershipId");

-- Seed platform-default day rate roles
INSERT INTO "DayRateRole" ("id", "organisationId", "name", "description", "sortOrder", "isActive", "createdAt") VALUES
  (gen_random_uuid()::text, NULL, 'Valeting Operative',              'Standard valeter day rate',        0, true, NOW()),
  (gen_random_uuid()::text, NULL, 'Valeting Operative Team Leader',  'Team leader day rate',             1, true, NOW()),
  (gen_random_uuid()::text, NULL, 'Driver Valeter',                  'Driver / collection valeter',      2, true, NOW()),
  (gen_random_uuid()::text, NULL, 'Workshop Cleaning',               'Workshop cleaning operative',      3, true, NOW());
