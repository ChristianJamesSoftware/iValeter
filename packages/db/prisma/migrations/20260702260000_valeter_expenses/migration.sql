-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ValeterExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT,
    "description" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "receiptFileUrl" TEXT,
    "weekStarting" TIMESTAMP(3) NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValeterExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValeterExpense_userId_idx" ON "ValeterExpense"("userId");
CREATE INDEX "ValeterExpense_siteId_idx" ON "ValeterExpense"("siteId");
CREATE INDEX "ValeterExpense_weekStarting_idx" ON "ValeterExpense"("weekStarting");
CREATE INDEX "ValeterExpense_status_idx" ON "ValeterExpense"("status");

-- AddForeignKey
ALTER TABLE "ValeterExpense" ADD CONSTRAINT "ValeterExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValeterExpense" ADD CONSTRAINT "ValeterExpense_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
