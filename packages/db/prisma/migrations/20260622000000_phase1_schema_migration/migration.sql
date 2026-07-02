-- Phase 1 Schema Migration: Payroll, Timesheets, Geofencing, Customer Portal
-- Generated: 2026-06-22

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "BillingCycle" AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE "PaymentTerms" AS ENUM ('NET14', 'MONTH_END', 'MONTH_END_PLUS1');
CREATE TYPE "StaffType" AS ENUM ('SITE', 'SSS');
CREATE TYPE "ServiceCategory" AS ENUM ('VALET', 'PAINT', 'CLEANING', 'OTHER');
CREATE TYPE "PriorityLevel" AS ENUM ('STANDARD', 'PRIORITY', 'URGENT');
CREATE TYPE "PhotoType" AS ENUM ('BEFORE', 'AFTER');
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RECTIFIED', 'CLOSED');
CREATE TYPE "ClockEventType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');
CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'DISPUTED', 'LOCKED');
CREATE TYPE "PayRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'EXPORTED', 'PAID');
CREATE TYPE "CustomerInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DISPUTED', 'PAID', 'OVERDUE');
CREATE TYPE "AuditStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "AuditCategory" AS ENUM ('SHOWROOM', 'FORECOURT', 'STANDARDS', 'FACILITIES');

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER SITE — add geofence, billing, account manager, customer contact
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Site"
  ADD COLUMN "geofenceLat"          DOUBLE PRECISION,
  ADD COLUMN "geofenceLng"          DOUBLE PRECISION,
  ADD COLUMN "geofenceRadiusMetres" INTEGER DEFAULT 100,
  ADD COLUMN "billingCycle"         "BillingCycle" NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN "paymentTerms"         "PaymentTerms" NOT NULL DEFAULT 'NET14',
  ADD COLUMN "xeroContactId"        TEXT,
  ADD COLUMN "customerContactName"  TEXT,
  ADD COLUMN "customerContactEmail" TEXT,
  ADD COLUMN "accountManagerUserId" TEXT;

ALTER TABLE "Site"
ALTER TABLE "Site" DROP CONSTRAINT IF EXISTS "Site_accountManagerUserId_fkey";
  ADD CONSTRAINT "Site_accountManagerUserId_fkey"
  FOREIGN KEY ("accountManagerUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER USER — add staff type, payroll fields, phone
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN "staffType"        "StaffType" NOT NULL DEFAULT 'SITE',
  ADD COLUMN "phone"            TEXT,
  ADD COLUMN "bankSortCode"     TEXT,
  ADD COLUMN "bankAccountNumber" TEXT,
  ADD COLUMN "bankAccountName"  TEXT,
  ADD COLUMN "bankReference"    TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER SERVICE TYPE — add description, category, charge rate
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "ServiceType"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "category"    "ServiceCategory" NOT NULL DEFAULT 'VALET',
  ADD COLUMN "chargeRate"  DOUBLE PRECISION;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER BOOKING — add priority, key/location fields, notifications, review
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Booking"
  ADD COLUMN "priorityLevel"               "PriorityLevel" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "keyNumber"                   TEXT,
  ADD COLUMN "vehicleLocation"             TEXT,
  ADD COLUMN "notifyEmail"                 TEXT,
  ADD COLUMN "notifyPhone"                 TEXT,
  ADD COLUMN "completionNotificationSent"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "customerReviewNote"          TEXT;

CREATE INDEX "Booking_vehicleReg_idx" ON "Booking"("vehicleReg");
CREATE INDEX "Booking_priorityLevel_idx" ON "Booking"("priorityLevel");

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER JOB PHOTO — add type enum (replaces String)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "JobPhoto"
  ADD COLUMN "type_new" "PhotoType" NOT NULL DEFAULT 'AFTER';

UPDATE "JobPhoto" SET "type_new" = 
  CASE WHEN "type" = 'BEFORE' THEN 'BEFORE'::"PhotoType" ELSE 'AFTER'::"PhotoType" END;

ALTER TABLE "JobPhoto" DROP COLUMN "type";
ALTER TABLE "JobPhoto" RENAME COLUMN "type_new" TO "type";

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: Complaint
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Complaint" (
  "id"                TEXT NOT NULL,
  "bookingId"         TEXT NOT NULL,
  "raisedByUserId"    TEXT NOT NULL,
  "note"              TEXT NOT NULL,
  "status"            "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "rectifiedByUserId" TEXT,
  "rectifiedNote"     TEXT,
  "rectifiedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Complaint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Complaint_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Complaint_rectifiedByUserId_fkey" FOREIGN KEY ("rectifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Complaint_bookingId_idx" ON "Complaint"("bookingId");
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: ClockEvent
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "ClockEvent" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "siteId"            TEXT NOT NULL,
  "type"              "ClockEventType" NOT NULL,
  "timestamp"         TIMESTAMP(3) NOT NULL,
  "lat"               DOUBLE PRECISION,
  "lng"               DOUBLE PRECISION,
  "geofenceTriggered" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClockEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClockEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClockEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ClockEvent_userId_idx" ON "ClockEvent"("userId");
CREATE INDEX "ClockEvent_siteId_idx" ON "ClockEvent"("siteId");
CREATE INDEX "ClockEvent_timestamp_idx" ON "ClockEvent"("timestamp");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: ContractorRate
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "ContractorRate" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "hourlyRate"    DOUBLE PRECISION NOT NULL,
  "overtimeRate"  DOUBLE PRECISION NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContractorRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContractorRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ContractorRate_userId_idx" ON "ContractorRate"("userId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: Timesheet
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Timesheet" (
  "id"                  TEXT NOT NULL,
  "userId"              TEXT NOT NULL,
  "siteId"              TEXT NOT NULL,
  "weekStarting"        TIMESTAMP(3) NOT NULL,
  "weekEnding"          TIMESTAMP(3) NOT NULL,
  "totalRegularHours"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalOvertimeHours"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"              "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedByUserId"    TEXT,
  "approvedAt"          TIMESTAMP(3),
  "sentToCustomerAt"    TIMESTAMP(3),
  "customerAccepted"    BOOLEAN NOT NULL DEFAULT FALSE,
  "customerAcceptedAt"  TIMESTAMP(3),
  "autoAccepted"        BOOLEAN NOT NULL DEFAULT FALSE,
  "customerDisputeNote" TEXT,
  "lateConfirmedAt"     TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Timesheet_userId_weekStarting_key" UNIQUE ("userId", "weekStarting"),
  CONSTRAINT "Timesheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Timesheet_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Timesheet_userId_idx" ON "Timesheet"("userId");
CREATE INDEX "Timesheet_siteId_idx" ON "Timesheet"("siteId");
CREATE INDEX "Timesheet_status_idx" ON "Timesheet"("status");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: TimesheetLine
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "TimesheetLine" (
  "id"            TEXT NOT NULL,
  "timesheetId"   TEXT NOT NULL,
  "date"          TIMESTAMP(3) NOT NULL,
  "clockInTime"   TIMESTAMP(3),
  "clockOutTime"  TIMESTAMP(3),
  "breakMins"     INTEGER NOT NULL DEFAULT 60,
  "regularHours"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "note"          TEXT,

  CONSTRAINT "TimesheetLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TimesheetLine_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TimesheetLine_timesheetId_idx" ON "TimesheetLine"("timesheetId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: PayRun
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "PayRun" (
  "id"             TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "weekStarting"   TIMESTAMP(3) NOT NULL,
  "weekEnding"     TIMESTAMP(3) NOT NULL,
  "status"         "PayRunStatus" NOT NULL DEFAULT 'DRAFT',
  "exportedAt"     TIMESTAMP(3),
  "paidAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayRun_organisationId_weekStarting_key" UNIQUE ("organisationId", "weekStarting"),
  CONSTRAINT "PayRun_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PayRun_organisationId_idx" ON "PayRun"("organisationId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: PayRunLine
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "PayRunLine" (
  "id"                TEXT NOT NULL,
  "payRunId"          TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "timesheetId"       TEXT NOT NULL,
  "regularHours"      DOUBLE PRECISION NOT NULL,
  "overtimeHours"     DOUBLE PRECISION NOT NULL,
  "hourlyRate"        DOUBLE PRECISION NOT NULL,
  "overtimeRate"      DOUBLE PRECISION NOT NULL,
  "totalAmount"       DOUBLE PRECISION NOT NULL,
  "bankSortCode"      TEXT,
  "bankAccountNumber" TEXT,
  "bankAccountName"   TEXT,
  "bankReference"     TEXT,

  CONSTRAINT "PayRunLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayRunLine_timesheetId_key" UNIQUE ("timesheetId"),
  CONSTRAINT "PayRunLine_payRunId_fkey" FOREIGN KEY ("payRunId") REFERENCES "PayRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PayRunLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PayRunLine_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PayRunLine_payRunId_idx" ON "PayRunLine"("payRunId");
CREATE INDEX "PayRunLine_userId_idx" ON "PayRunLine"("userId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: CustomerInvoice
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "CustomerInvoice" (
  "id"               TEXT NOT NULL,
  "organisationId"   TEXT NOT NULL,
  "siteId"           TEXT NOT NULL,
  "periodStart"      TIMESTAMP(3) NOT NULL,
  "periodEnd"        TIMESTAMP(3) NOT NULL,
  "billingCycle"     "BillingCycle" NOT NULL,
  "paymentTerms"     "PaymentTerms" NOT NULL,
  "dueDate"          TIMESTAMP(3) NOT NULL,
  "status"           "CustomerInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "totalAmount"      DOUBLE PRECISION NOT NULL,
  "currency"         TEXT NOT NULL DEFAULT 'GBP',
  "xeroInvoiceId"    TEXT,
  "xeroInvoiceNumber" TEXT,
  "xeroSyncedAt"     TIMESTAMP(3),
  "issuedAt"         TIMESTAMP(3),
  "paidAt"           TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerInvoice_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerInvoice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CustomerInvoice_organisationId_idx" ON "CustomerInvoice"("organisationId");
CREATE INDEX "CustomerInvoice_siteId_idx" ON "CustomerInvoice"("siteId");
CREATE INDEX "CustomerInvoice_status_idx" ON "CustomerInvoice"("status");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: CustomerInvoiceLineItem
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "CustomerInvoiceLineItem" (
  "id"          TEXT NOT NULL,
  "invoiceId"   TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity"    DOUBLE PRECISION NOT NULL,
  "unitAmount"  DOUBLE PRECISION NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "serviceType" TEXT,

  CONSTRAINT "CustomerInvoiceLineItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerInvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CustomerInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CustomerInvoiceLineItem_invoiceId_idx" ON "CustomerInvoiceLineItem"("invoiceId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: Audit
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Audit" (
  "id"                   TEXT NOT NULL,
  "siteId"               TEXT NOT NULL,
  "accountManagerUserId" TEXT NOT NULL,
  "visitDate"            TIMESTAMP(3) NOT NULL,
  "overallScore"         DOUBLE PRECISION,
  "status"               "AuditStatus" NOT NULL DEFAULT 'DRAFT',
  "notes"                TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Audit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Audit_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Audit_accountManagerUserId_fkey" FOREIGN KEY ("accountManagerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Audit_siteId_idx" ON "Audit"("siteId");
CREATE INDEX "Audit_accountManagerUserId_idx" ON "Audit"("accountManagerUserId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: AuditChecklistItem
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "AuditChecklistItem" (
  "id"          TEXT NOT NULL,
  "auditId"     TEXT NOT NULL,
  "category"    "AuditCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "passed"      BOOLEAN NOT NULL,
  "note"        TEXT,
  "photoUrl"    TEXT,

  CONSTRAINT "AuditChecklistItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditChecklistItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AuditChecklistItem_auditId_idx" ON "AuditChecklistItem"("auditId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: WeeklyReview
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "WeeklyReview" (
  "id"                  TEXT NOT NULL,
  "siteId"              TEXT NOT NULL,
  "weekStarting"        TIMESTAMP(3) NOT NULL,
  "generatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalJobsCompleted"  INTEGER NOT NULL,
  "totalCostExVat"      DOUBLE PRECISION NOT NULL,
  "complaintsRaised"    INTEGER NOT NULL DEFAULT 0,
  "complaintsRectified" INTEGER NOT NULL DEFAULT 0,
  "emailSentAt"         TIMESTAMP(3),

  CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyReview_siteId_weekStarting_key" UNIQUE ("siteId", "weekStarting"),
  CONSTRAINT "WeeklyReview_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "WeeklyReview_siteId_idx" ON "WeeklyReview"("siteId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: WeeklyReviewAudit (join table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "WeeklyReviewAudit" (
  "id"             TEXT NOT NULL,
  "weeklyReviewId" TEXT NOT NULL,
  "auditId"        TEXT NOT NULL,

  CONSTRAINT "WeeklyReviewAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyReviewAudit_weeklyReviewId_fkey" FOREIGN KEY ("weeklyReviewId") REFERENCES "WeeklyReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WeeklyReviewAudit_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "WeeklyReviewAudit_weeklyReviewId_idx" ON "WeeklyReviewAudit"("weeklyReviewId");

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW TABLE: AccountManagerMessage
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "AccountManagerMessage" (
  "id"         TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId"   TEXT NOT NULL,
  "siteId"     TEXT NOT NULL,
  "message"    TEXT NOT NULL,
  "readAt"     TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountManagerMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountManagerMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountManagerMessage_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AccountManagerMessage_fromUserId_idx" ON "AccountManagerMessage"("fromUserId");
CREATE INDEX "AccountManagerMessage_toUserId_idx" ON "AccountManagerMessage"("toUserId");
CREATE INDEX "AccountManagerMessage_siteId_idx" ON "AccountManagerMessage"("siteId");
