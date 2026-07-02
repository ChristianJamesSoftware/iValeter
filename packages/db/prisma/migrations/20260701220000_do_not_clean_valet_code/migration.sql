-- Migration: Do Not Clean flag on Booking + valetCode/nominalCode/departmentType on ValetTypeTemplate

-- Add doNotClean to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "doNotClean" BOOLEAN NOT NULL DEFAULT false;

-- Add ValetDepartmentType enum
DO $$ BEGIN
  CREATE TYPE "ValetDepartmentType" AS ENUM ('SALES', 'SERVICE', 'BODYSHOP', 'ALL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to ValetTypeTemplate
ALTER TABLE "ValetTypeTemplate" ADD COLUMN IF NOT EXISTS "valetCode" TEXT;
ALTER TABLE "ValetTypeTemplate" ADD COLUMN IF NOT EXISTS "nominalCode" TEXT;
ALTER TABLE "ValetTypeTemplate" ADD COLUMN IF NOT EXISTS "departmentType" "ValetDepartmentType" NOT NULL DEFAULT 'ALL';

-- Unique constraint on valetCode (allow NULLs)
DO $$ BEGIN
ALTER TABLE "ValetTypeTemplate" DROP CONSTRAINT IF EXISTS "ValetTypeTemplate_valetCode_key";
  ALTER TABLE "ValetTypeTemplate" ADD CONSTRAINT "ValetTypeTemplate_valetCode_key" UNIQUE ("valetCode");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
