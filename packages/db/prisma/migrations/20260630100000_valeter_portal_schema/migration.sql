-- AlterTable: User schedule fields
ALTER TABLE "User" ADD COLUMN "workingDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "contractedHours" DOUBLE PRECISION;

-- CreateEnum
CREATE TYPE "OvertimeStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable: Message
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OvertimeRequest
CREATE TABLE "OvertimeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "siteId" TEXT,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "requestedHours" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "OvertimeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_toUserId_idx" ON "Message"("toUserId");
CREATE INDEX "Message_fromUserId_idx" ON "Message"("fromUserId");
CREATE INDEX "Message_organisationId_idx" ON "Message"("organisationId");
CREATE INDEX "OvertimeRequest_userId_idx" ON "OvertimeRequest"("userId");
CREATE INDEX "OvertimeRequest_organisationId_idx" ON "OvertimeRequest"("organisationId");

-- AddForeignKey
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_fromUserId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_toUserId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OvertimeRequest" DROP CONSTRAINT IF EXISTS "OvertimeRequest_userId_fkey";
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
