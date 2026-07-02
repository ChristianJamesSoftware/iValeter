-- AlterTable Dealership: add accounts contact + payment terms fields
ALTER TABLE "Dealership"
    ADD COLUMN IF NOT EXISTS "accountsContactName"  TEXT,
    ADD COLUMN IF NOT EXISTS "accountsContactEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "accountsContactPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "paymentTermsDays"     INTEGER,
    ADD COLUMN IF NOT EXISTS "paymentTermsNote"     TEXT,
    ADD COLUMN IF NOT EXISTS "creditLimit"          DOUBLE PRECISION;
