-- Phase 1: Payroll, Timesheets, Geofencing & Customer Portal
-- Idempotent version — all statements use IF NOT EXISTS / DO $$ guards
-- so this migration is safe to run even if it partially executed before.

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW ENUMS (safe: only create if they don't already exist)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('WEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentTerms" AS ENUM ('NET14', 'MONTH_END', 'MONTH_END_PLUS1');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StaffType" AS ENUM ('SITE', 'SSS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ServiceCategory" AS ENUM ('VALET', 'PAINT', 'CLEANING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PriorityLevel" AS ENUM ('STANDARD', 'PRIORITY', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RECTIFIED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClockEventType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'DISPUTED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PayRunStatus" AS ENUM ('DRAFT', 'APPROVED', 'EXPORTED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DISPUTED', 'PAID', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AuditStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AuditCategory" AS ENUM ('SHOWROOM', 'FORECOURT', 'STANDARDS', 'FACILITIES');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER Organisation — new feature flags
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "Organisation" ADD COLUMN "featureGeofencing" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Organisation" ADD COLUMN "featureTimesheets" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Organisation" ADD COLUMN "featurePayroll" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Organisation" ADD COLUMN "featureCustomerPortal" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER Site — geofence, billing, account manager, customer contact
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "geofenceLat" DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "geofenceLng" DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "geofenceRadiusMetres" INTEGER DEFAULT 100;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'WEEKLY';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'NET14';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "xeroContactId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "customerContactName" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "customerContactEmail" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD COLUMN "accountManagerUserId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Site" ADD CONSTRAINT "Site_accountManagerUserId_fkey"
    FOREIGN KEY ("accountManagerUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER User — staffType, phone, Bankline fields
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "staffType" "StaffType" NOT NULL DEFAULT 'SITE';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "phone" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "bankSortCode" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "bankAccountNumber" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "bankAccountName" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "bankReference" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER ServiceType — description, category, chargeRate
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "ServiceType" ADD COLUMN "description" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceType" ADD COLUMN "category" "ServiceCategory" NOT NULL DEFAULT 'VALET';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceType" ADD COLUMN "chargeRate" DOUBLE PRECISION;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER Booking — priorityLevel, key/location, notification, review
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "Booking" ADD COLUMN "priorityLevel" "PriorityLevel" NOT NULL DEFAULT 'STANDARD';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD COLUMN "keyNumber" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD COLUMN "vehicleLocation" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD COLUMN "notifyEmail" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD COLUMN "notifyPhone" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD COLUMN "completionNotificationSent" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD COLUMN "customerReviewNote" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX "Booking_vehicleReg_idx" ON "Booking"("vehicleReg");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX "Booking_priorityLevel_idx" ON "Booking"("priorityLevel");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Complaint
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Complaint" (
  "id"                TEXT NOT NULL,
  "bookingId"         TEXT NOT NULL,
  "raisedByUserId"    TEXT NOT NULL,
  "note"              TEXT NOT NULL,
  "status"            "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "rectifiedByUserId" TEXT,
  "rectifiedNote"     TEXT,
  "rectifiedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Complaint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Complaint_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Complaint_rectifiedByUserId_fkey" FOREIGN KEY ("rectifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

DO $$ BEGIN
  CREATE INDEX "Complaint_bookingId_idx" ON "Complaint"("bookingId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ClockEvent
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClockEvent" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "siteId"            TEXT NOT NULL,
  "type"              "ClockEventType" NOT NULL,
  "timestamp"         TIMESTAMP(3) NOT NULL,
  "lat"               DOUBLE PRECISION,
  "lng"               DOUBLE PRECISION,
  "geofenceTriggered" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClockEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClockEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClockEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN CREATE INDEX "ClockEvent_userId_idx" ON "ClockEvent"("userId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "ClockEvent_siteId_idx" ON "ClockEvent"("siteId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "ClockEvent_timestamp_idx" ON "ClockEvent"("timestamp"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ContractorRate
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ContractorRate" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "hourlyRate"    DOUBLE PRECISION NOT NULL,
  "overtimeRate"  DOUBLE PRECISION NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractorRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContractorRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN CREATE INDEX "ContractorRate_userId_idx" ON "ContractorRate"("userId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Timesheet + TimesheetLine
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Timesheet" (
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
  "customerAccepted"    BOOLEAN NOT NULL DEFAULT false,
  "customerAcceptedAt"  TIMESTAMP(3),
  "autoAccepted"        BOOLEAN NOT NULL DEFAULT false,
  "customerDisputeNote" TEXT,
  "lateConfirmedAt"     TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Timesheet_userId_weekStarting_key" UNIQUE ("userId", "weekStarting"),
  CONSTRAINT "Timesheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Timesheet_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN CREATE INDEX "Timesheet_userId_idx" ON "Timesheet"("userId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "Timesheet_siteId_idx" ON "Timesheet"("siteId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "Timesheet_status_idx" ON "Timesheet"("status"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "TimesheetLine" (
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

DO $$ BEGIN CREATE INDEX "TimesheetLine_timesheetId_idx" ON "TimesheetLine"("timesheetId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PayRun + PayRunLine
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PayRun" (
  "id"             TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "weekStarting"   TIMESTAMP(3) NOT NULL,
  "weekEnding"     TIMESTAMP(3) NOT NULL,
  "status"         "PayRunStatus" NOT NULL DEFAULT 'DRAFT',
  "exportedAt"     TIMESTAMP(3),
  "paidAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayRun_organisationId_weekStarting_key" UNIQUE ("organisationId", "weekStarting"),
  CONSTRAINT "PayRun_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN CREATE INDEX "PayRun_organisationId_idx" ON "PayRun"("organisationId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PayRunLine" (
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

DO $$ BEGIN CREATE INDEX "PayRunLine_payRunId_idx" ON "PayRunLine"("payRunId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "PayRunLine_userId_idx" ON "PayRunLine"("userId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CustomerInvoice + CustomerInvoiceLineItem
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CustomerInvoice" (
  "id"                TEXT NOT NULL,
  "organisationId"    TEXT NOT NULL,
  "siteId"            TEXT NOT NULL,
  "periodStart"       TIMESTAMP(3) NOT NULL,
  "periodEnd"         TIMESTAMP(3) NOT NULL,
  "billingCycle"      "BillingCycle" NOT NULL,
  "paymentTerms"      "PaymentTerms" NOT NULL,
  "dueDate"           TIMESTAMP(3) NOT NULL,
  "status"            "CustomerInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "totalAmount"       DOUBLE PRECISION NOT NULL,
  "currency"          TEXT NOT NULL DEFAULT 'GBP',
  "xeroInvoiceId"     TEXT,
  "xeroInvoiceNumber" TEXT,
  "xeroSyncedAt"      TIMESTAMP(3),
  "issuedAt"          TIMESTAMP(3),
  "paidAt"            TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerInvoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerInvoice_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomerInvoice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN CREATE INDEX "CustomerInvoice_organisationId_idx" ON "CustomerInvoice"("organisationId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "CustomerInvoice_siteId_idx" ON "CustomerInvoice"("siteId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "CustomerInvoice_status_idx" ON "CustomerInvoice"("status"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CustomerInvoiceLineItem" (
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

DO $$ BEGIN CREATE INDEX "CustomerInvoiceLineItem_invoiceId_idx" ON "CustomerInvoiceLineItem"("invoiceId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit + AuditChecklistItem
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Audit" (
  "id"                   TEXT NOT NULL,
  "siteId"               TEXT NOT NULL,
  "accountManagerUserId" TEXT NOT NULL,
  "visitDate"            TIMESTAMP(3) NOT NULL,
  "overallScore"         DOUBLE PRECISION,
  "status"               "AuditStatus" NOT NULL DEFAULT 'DRAFT',
  "notes"                TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Audit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Audit_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Audit_accountManagerUserId_fkey" FOREIGN KEY ("accountManagerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN CREATE INDEX "Audit_siteId_idx" ON "Audit"("siteId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "Audit_accountManagerUserId_idx" ON "Audit"("accountManagerUserId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AuditChecklistItem" (
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

DO $$ BEGIN CREATE INDEX "AuditChecklistItem_auditId_idx" ON "AuditChecklistItem"("auditId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- WeeklyReview + WeeklyReviewAudit
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "WeeklyReview" (
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

DO $$ BEGIN CREATE INDEX "WeeklyReview_siteId_idx" ON "WeeklyReview"("siteId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "WeeklyReviewAudit" (
  "id"             TEXT NOT NULL,
  "weeklyReviewId" TEXT NOT NULL,
  "auditId"        TEXT NOT NULL,
  CONSTRAINT "WeeklyReviewAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyReviewAudit_weeklyReviewId_fkey" FOREIGN KEY ("weeklyReviewId") REFERENCES "WeeklyReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WeeklyReviewAudit_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN CREATE INDEX "WeeklyReviewAudit_weeklyReviewId_idx" ON "WeeklyReviewAudit"("weeklyReviewId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- AccountManagerMessage
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AccountManagerMessage" (
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

DO $$ BEGIN CREATE INDEX "AccountManagerMessage_fromUserId_idx" ON "AccountManagerMessage"("fromUserId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "AccountManagerMessage_toUserId_idx" ON "AccountManagerMessage"("toUserId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX "AccountManagerMessage_siteId_idx" ON "AccountManagerMessage"("siteId"); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
