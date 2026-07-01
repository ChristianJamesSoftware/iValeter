-- Add management role to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'management';

-- Add ManagementRole enum
DO $$ BEGIN
  CREATE TYPE "ManagementRole" AS ENUM ('ADMINISTRATION', 'ACCOUNTANT', 'ACCOUNT_MANAGER', 'COO', 'CEO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add managementRole field to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "managementRole" "ManagementRole";

-- Add SA_APPROVED to TimesheetStatus enum
ALTER TYPE "TimesheetStatus" ADD VALUE IF NOT EXISTS 'SA_APPROVED';

-- Add SA approval fields to Timesheet
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "saApprovedByUserId" TEXT;
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "saApprovedAt" TIMESTAMP(3);
