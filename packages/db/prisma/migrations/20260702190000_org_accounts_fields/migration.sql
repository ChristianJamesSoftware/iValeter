-- AlterTable Organisation: add accounts contact fields (mirrors Dealership)
ALTER TABLE "Organisation"
    ADD COLUMN IF NOT EXISTS "accountsContactName"  TEXT,
    ADD COLUMN IF NOT EXISTS "accountsContactEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "accountsContactPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "paymentTermsDays"     INTEGER,
    ADD COLUMN IF NOT EXISTS "paymentTermsNote"     TEXT,
    ADD COLUMN IF NOT EXISTS "creditLimit"          DOUBLE PRECISION;
