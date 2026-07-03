-- CreateEnum
CREATE TYPE "SiteSubmissionStatus" AS ENUM ('PENDING_SEND', 'SENT', 'DEALER_ACCEPTED', 'DEALER_DISPUTED', 'AUTO_ACCEPTED');

-- CreateTable
CREATE TABLE "SiteWeekSubmission" (
    "id"                TEXT NOT NULL,
    "siteId"            TEXT NOT NULL,
    "weekStarting"      TIMESTAMP(3) NOT NULL,
    "status"            "SiteSubmissionStatus" NOT NULL DEFAULT 'PENDING_SEND',
    "sentAt"            TIMESTAMP(3),
    "dealerRespondedAt" TIMESTAMP(3),
    "autoAcceptedAt"    TIMESTAMP(3),
    "dealerDisputeNote" TEXT,
    "sentByUserId"      TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteWeekSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteWeekSubmission_siteId_weekStarting_key" ON "SiteWeekSubmission"("siteId", "weekStarting");
CREATE INDEX "SiteWeekSubmission_siteId_idx"      ON "SiteWeekSubmission"("siteId");
CREATE INDEX "SiteWeekSubmission_weekStarting_idx" ON "SiteWeekSubmission"("weekStarting");
CREATE INDEX "SiteWeekSubmission_status_idx"       ON "SiteWeekSubmission"("status");

-- AddForeignKey
ALTER TABLE "SiteWeekSubmission" ADD CONSTRAINT "SiteWeekSubmission_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
