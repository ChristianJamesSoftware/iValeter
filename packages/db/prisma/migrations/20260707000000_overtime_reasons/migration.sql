-- CreateTable: OvertimeReason
CREATE TABLE "OvertimeReason" (
    "id"             TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "label"          TEXT NOT NULL,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OvertimeReason_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OvertimeReason_organisationId_idx" ON "OvertimeReason"("organisationId");

-- Add optional reasonId to OvertimeRequest
ALTER TABLE "OvertimeRequest" ADD COLUMN "reasonId" TEXT;
ALTER TABLE "OvertimeRequest"
    ADD CONSTRAINT "OvertimeRequest_reasonId_fkey"
    FOREIGN KEY ("reasonId") REFERENCES "OvertimeReason"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default reasons for Total Valeting org
INSERT INTO "OvertimeReason" ("id", "organisationId", "label", "sortOrder", "isActive", "createdAt")
VALUES
  (gen_random_uuid()::text, 'cmr236nkj000bs48ws2frtiuv', 'Requested by Customer',  0, true, NOW()),
  (gen_random_uuid()::text, 'cmr236nkj000bs48ws2frtiuv', 'Salesman Request',        1, true, NOW()),
  (gen_random_uuid()::text, 'cmr236nkj000bs48ws2frtiuv', 'Worked Lunchtime',        2, true, NOW());
