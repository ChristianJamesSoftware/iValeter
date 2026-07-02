-- Remove piece work tables if they exist from previous migration attempt
DROP TABLE IF EXISTS "DealershipPieceRate";

-- Remove pieceworkEnabled and defaultPieceRatePence if they exist
ALTER TABLE "Dealership" DROP COLUMN IF EXISTS "pieceworkEnabled";
ALTER TABLE "ValetTypeTemplate" DROP COLUMN IF EXISTS "defaultPieceRatePence";

-- Valeter standing charges (recurring extra work lines set by ops)
CREATE TABLE "ValeterStandingCharge" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "ratePence"   INTEGER NOT NULL,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ValeterStandingCharge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ValeterStandingCharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ValeterStandingCharge_userId_idx" ON "ValeterStandingCharge"("userId");

-- Timesheet extra lines (auto-seeded from standing charges + manual one-offs)
CREATE TABLE "TimesheetExtraLine" (
  "id"          TEXT NOT NULL,
  "timesheetId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "ratePence"   INTEGER NOT NULL,
  "isRecurring" BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimesheetExtraLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TimesheetExtraLine_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TimesheetExtraLine_timesheetId_idx" ON "TimesheetExtraLine"("timesheetId");
