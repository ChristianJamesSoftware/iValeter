-- CreateEnum
CREATE TYPE "DeductionType" AS ENUM ('DAILY', 'ACCIDENT', 'UNIFORM', 'STANDING', 'OTHER');

-- AlterEnum
-- Add VALETER_REQUESTED to BankChangeStatus
ALTER TYPE "BankChangeStatus" ADD VALUE IF NOT EXISTS 'VALETER_REQUESTED';

-- CreateTable
CREATE TABLE "TimesheetDeduction" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "type" "DeductionType" NOT NULL,
    "description" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "accidentId" TEXT,
    "valeterDeductionId" TEXT,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimesheetDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimesheetDeduction_timesheetId_idx" ON "TimesheetDeduction"("timesheetId");

-- AddForeignKey
ALTER TABLE "TimesheetDeduction" ADD CONSTRAINT "TimesheetDeduction_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetDeduction" ADD CONSTRAINT "TimesheetDeduction_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
