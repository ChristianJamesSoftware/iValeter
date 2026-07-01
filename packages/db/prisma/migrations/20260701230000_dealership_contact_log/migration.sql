-- Migration: DealershipNote — CRM contact log per dealership

CREATE TABLE IF NOT EXISTS "DealershipNote" (
  "id"              TEXT NOT NULL,
  "dealershipId"    TEXT NOT NULL,
  "contactDate"     TIMESTAMP(3) NOT NULL,
  "contactName"     TEXT NOT NULL,
  "regards"         TEXT NOT NULL,
  "agreed"          TEXT NOT NULL,
  "followUpDate"    TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DealershipNote_pkey" PRIMARY KEY ("id")
);

-- FK to Dealership
ALTER TABLE "DealershipNote"
  ADD CONSTRAINT "DealershipNote_dealershipId_fkey"
  FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK to User (nullable)
ALTER TABLE "DealershipNote"
  ADD CONSTRAINT "DealershipNote_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "DealershipNote_dealershipId_idx" ON "DealershipNote"("dealershipId");
CREATE INDEX IF NOT EXISTS "DealershipNote_contactDate_idx"  ON "DealershipNote"("contactDate");
