-- AlterTable User: add per-day hours JSON field
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "dayHours" JSONB;

-- CreateEnum BankChangeStatus (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankChangeStatus') THEN
        CREATE TYPE "BankChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- CreateTable ValeterDeduction
CREATE TABLE IF NOT EXISTS "ValeterDeduction" (
    "id"            TEXT NOT NULL,
    "valeterId"     TEXT NOT NULL,
    "description"   TEXT NOT NULL,
    "totalAmount"   DOUBLE PRECISION NOT NULL,
    "weeklyAmount"  DOUBLE PRECISION NOT NULL,
    "totalDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settled"       BOOLEAN NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValeterDeduction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ValeterDeduction_valeterId_idx" ON "ValeterDeduction"("valeterId");
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ValeterDeduction_valeterId_fkey'
    ) THEN
        ALTER TABLE "ValeterDeduction"
            ADD CONSTRAINT "ValeterDeduction_valeterId_fkey"
            FOREIGN KEY ("valeterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable BankChangeRequest
CREATE TABLE IF NOT EXISTS "BankChangeRequest" (
    "id"                 TEXT NOT NULL,
    "valeterId"          TEXT NOT NULL,
    "newSortCode"        TEXT NOT NULL,
    "newAccountNumber"   TEXT NOT NULL,
    "newAccountName"     TEXT NOT NULL,
    "newBankReference"   TEXT,
    "evidenceUrl"        TEXT,
    "feeAmount"          DOUBLE PRECISION NOT NULL DEFAULT 25,
    "feeDeducted"        BOOLEAN NOT NULL DEFAULT false,
    "weekDeducted"       TEXT,
    "status"             "BankChangeStatus" NOT NULL DEFAULT 'PENDING',
    "notes"              TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BankChangeRequest_valeterId_idx" ON "BankChangeRequest"("valeterId");
CREATE INDEX IF NOT EXISTS "BankChangeRequest_status_idx"    ON "BankChangeRequest"("status");
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'BankChangeRequest_valeterId_fkey'
    ) THEN
        ALTER TABLE "BankChangeRequest"
            ADD CONSTRAINT "BankChangeRequest_valeterId_fkey"
            FOREIGN KEY ("valeterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable User: add shift start/end time for auto clock-out sweep
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "shiftStartTime" TEXT,
    ADD COLUMN IF NOT EXISTS "shiftEndTime"   TEXT;
