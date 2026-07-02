-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportService" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportServiceBooking" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "contactName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "SupportServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportService_organisationId_idx" ON "SupportService"("organisationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportServiceBooking_organisationId_idx" ON "SupportServiceBooking"("organisationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportServiceBooking_siteId_idx" ON "SupportServiceBooking"("siteId");

-- AddForeignKey
ALTER TABLE "SupportService" DROP CONSTRAINT IF EXISTS "SupportService_organisationId_fkey";
ALTER TABLE "SupportService" ADD CONSTRAINT "SupportService_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportServiceBooking" DROP CONSTRAINT IF EXISTS "SupportServiceBooking_organisationId_fkey";
ALTER TABLE "SupportServiceBooking" ADD CONSTRAINT "SupportServiceBooking_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportServiceBooking" DROP CONSTRAINT IF EXISTS "SupportServiceBooking_serviceId_fkey";
ALTER TABLE "SupportServiceBooking" ADD CONSTRAINT "SupportServiceBooking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "SupportService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportServiceBooking" DROP CONSTRAINT IF EXISTS "SupportServiceBooking_siteId_fkey";
ALTER TABLE "SupportServiceBooking" ADD CONSTRAINT "SupportServiceBooking_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportServiceBooking" DROP CONSTRAINT IF EXISTS "SupportServiceBooking_createdById_fkey";
ALTER TABLE "SupportServiceBooking" ADD CONSTRAINT "SupportServiceBooking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
