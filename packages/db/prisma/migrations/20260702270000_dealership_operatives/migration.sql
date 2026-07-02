-- CreateTable: DealershipOperative
CREATE TABLE "DealershipOperative" (
    "id" TEXT NOT NULL,
    "dealershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "departmentName" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "allocatedHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "dayRatePence" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealershipOperative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealershipOperative_dealershipId_idx" ON "DealershipOperative"("dealershipId");

-- AddForeignKey
ALTER TABLE "DealershipOperative" ADD CONSTRAINT "DealershipOperative_dealershipId_fkey"
    FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DealershipOperative" ADD CONSTRAINT "DealershipOperative_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "DayRateRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: DealershipWeeklyTask
CREATE TABLE "DealershipWeeklyTask" (
    "id" TEXT NOT NULL,
    "dealershipId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "allocatedHoursPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weeklyRatePence" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealershipWeeklyTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealershipWeeklyTask_dealershipId_idx" ON "DealershipWeeklyTask"("dealershipId");

-- AddForeignKey
ALTER TABLE "DealershipWeeklyTask" ADD CONSTRAINT "DealershipWeeklyTask_dealershipId_fkey"
    FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
