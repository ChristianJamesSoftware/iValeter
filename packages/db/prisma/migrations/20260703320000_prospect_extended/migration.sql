-- AlterTable: add extended fields to ProspectValeter
ALTER TABLE "ProspectValeter"
  ADD COLUMN IF NOT EXISTS "town"              TEXT,
  ADD COLUMN IF NOT EXISTS "experience"        TEXT,
  ADD COLUMN IF NOT EXISTS "ukLicence"         BOOLEAN,
  ADD COLUMN IF NOT EXISTS "drives"            BOOLEAN,
  ADD COLUMN IF NOT EXISTS "position"          TEXT,
  ADD COLUMN IF NOT EXISTS "payRequirementMin" INTEGER,
  ADD COLUMN IF NOT EXISTS "payRequirementMax" INTEGER,
  ADD COLUMN IF NOT EXISTS "source"            TEXT,
  ADD COLUMN IF NOT EXISTS "employmentHistory" TEXT;

-- CreateTable: ProspectBroadcast
CREATE TABLE IF NOT EXISTS "ProspectBroadcast" (
  "id"             TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "subject"        TEXT NOT NULL,
  "message"        TEXT NOT NULL,
  "areaFilter"     TEXT,
  "statusFilter"   TEXT,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentByUserId"   TEXT NOT NULL,
  "sentAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProspectBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ProspectBroadcastRecipient
CREATE TABLE IF NOT EXISTS "ProspectBroadcastRecipient" (
  "id"          TEXT NOT NULL,
  "broadcastId" TEXT NOT NULL,
  "prospectId"  TEXT NOT NULL,
  "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProspectBroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "ProspectBroadcast_organisationId_idx" ON "ProspectBroadcast"("organisationId");
CREATE INDEX IF NOT EXISTS "ProspectBroadcast_sentAt_idx" ON "ProspectBroadcast"("sentAt");
CREATE INDEX IF NOT EXISTS "ProspectBroadcastRecipient_prospectId_idx" ON "ProspectBroadcastRecipient"("prospectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProspectBroadcastRecipient_broadcastId_prospectId_key" ON "ProspectBroadcastRecipient"("broadcastId", "prospectId");

-- Indexes on ProspectValeter new fields
CREATE INDEX IF NOT EXISTS "ProspectValeter_town_idx" ON "ProspectValeter"("town");

-- Foreign Keys
ALTER TABLE "ProspectBroadcast"
  ADD CONSTRAINT "ProspectBroadcast_organisationId_fkey"
    FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProspectBroadcast_sentByUserId_fkey"
    FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProspectBroadcastRecipient"
  ADD CONSTRAINT "ProspectBroadcastRecipient_broadcastId_fkey"
    FOREIGN KEY ("broadcastId") REFERENCES "ProspectBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProspectBroadcastRecipient_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "ProspectValeter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
