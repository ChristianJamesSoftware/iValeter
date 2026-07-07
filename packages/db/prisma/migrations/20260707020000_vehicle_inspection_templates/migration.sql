-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('PDI', 'USED_TRANSFER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InspectionCheckOverrideType" AS ENUM ('HIDDEN', 'ADDED');

-- CreateTable
CREATE TABLE "InspectionTemplate" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "InspectionType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionCheckItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteInspectionTemplate" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteInspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteInspectionCheckOverride" (
    "id" TEXT NOT NULL,
    "siteTemplateId" TEXT NOT NULL,
    "overrideType" "InspectionCheckOverrideType" NOT NULL,
    "checkItemId" TEXT,
    "label" TEXT,
    "description" TEXT,
    "category" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteInspectionCheckOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InspectionTemplate_organisationId_idx" ON "InspectionTemplate"("organisationId");

-- CreateIndex
CREATE INDEX "InspectionCheckItem_templateId_idx" ON "InspectionCheckItem"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteInspectionTemplate_siteId_templateId_key" ON "SiteInspectionTemplate"("siteId", "templateId");

-- CreateIndex
CREATE INDEX "SiteInspectionTemplate_siteId_idx" ON "SiteInspectionTemplate"("siteId");

-- CreateIndex
CREATE INDEX "SiteInspectionCheckOverride_siteTemplateId_idx" ON "SiteInspectionCheckOverride"("siteTemplateId");

-- AddForeignKey
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionCheckItem" ADD CONSTRAINT "InspectionCheckItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInspectionTemplate" ADD CONSTRAINT "SiteInspectionTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInspectionTemplate" ADD CONSTRAINT "SiteInspectionTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInspectionCheckOverride" ADD CONSTRAINT "SiteInspectionCheckOverride_siteTemplateId_fkey" FOREIGN KEY ("siteTemplateId") REFERENCES "SiteInspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInspectionCheckOverride" ADD CONSTRAINT "SiteInspectionCheckOverride_checkItemId_fkey" FOREIGN KEY ("checkItemId") REFERENCES "InspectionCheckItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default templates for Total Valeting org
INSERT INTO "InspectionTemplate" ("id", "organisationId", "name", "description", "type", "isActive", "sortOrder", "updatedAt")
SELECT
  'insp_tpl_pdi_001',
  id,
  'PDI — New Vehicle',
  'Checklist for new vehicles arriving from manufacturer on transporter',
  'PDI'::"InspectionType",
  true,
  1,
  NOW()
FROM "Organisation"
WHERE slug = 'total-valeting'
ON CONFLICT DO NOTHING;

INSERT INTO "InspectionTemplate" ("id", "organisationId", "name", "description", "type", "isActive", "sortOrder", "updatedAt")
SELECT
  'insp_tpl_used_001',
  id,
  'Used Vehicle Transfer',
  'Checklist for used vehicles arriving from another dealership or auction',
  'USED_TRANSFER'::"InspectionType",
  true,
  2,
  NOW()
FROM "Organisation"
WHERE slug = 'total-valeting'
ON CONFLICT DO NOTHING;

-- Seed PDI check items
INSERT INTO "InspectionCheckItem" ("id", "templateId", "label", "description", "category", "isRequired", "sortOrder", "updatedAt") VALUES
  ('ici_pdi_01', 'insp_tpl_pdi_001', 'VIN / Chassis number verified', 'Check VIN on windscreen plate, door jamb and invoice match', 'Identity & Documents', true, 1, NOW()),
  ('ici_pdi_02', 'insp_tpl_pdi_001', 'Owner''s handbook present', NULL, 'Identity & Documents', true, 2, NOW()),
  ('ici_pdi_03', 'insp_tpl_pdi_001', 'Service / warranty book present', NULL, 'Identity & Documents', true, 3, NOW()),
  ('ici_pdi_04', 'insp_tpl_pdi_001', 'Spare / second key fob present', NULL, 'Accessories', true, 4, NOW()),
  ('ici_pdi_05', 'insp_tpl_pdi_001', 'Locking wheel nut key present', NULL, 'Accessories', true, 5, NOW()),
  ('ici_pdi_06', 'insp_tpl_pdi_001', 'Floor mats present and correct fit', NULL, 'Accessories', true, 6, NOW()),
  ('ici_pdi_07', 'insp_tpl_pdi_001', 'Parcel shelf / boot cover present', NULL, 'Accessories', false, 7, NOW()),
  ('ici_pdi_08', 'insp_tpl_pdi_001', 'Jack, wheel brace and tool kit present', NULL, 'Accessories', true, 8, NOW()),
  ('ici_pdi_09', 'insp_tpl_pdi_001', 'Spare wheel / tyre inflation kit present', NULL, 'Accessories', false, 9, NOW()),
  ('ici_pdi_10', 'insp_tpl_pdi_001', 'EV / PHEV charging cable present', 'Only applicable to EV and PHEV models', 'Accessories', false, 10, NOW()),
  ('ici_pdi_11', 'insp_tpl_pdi_001', 'Car air freshener present', NULL, 'Accessories', false, 11, NOW()),
  ('ici_pdi_12', 'insp_tpl_pdi_001', 'Transit protection film removed', NULL, 'Exterior', true, 12, NOW()),
  ('ici_pdi_13', 'insp_tpl_pdi_001', 'Body panels — no damage', 'Inspect all panels for dents, scratches, paint chips', 'Exterior', true, 13, NOW()),
  ('ici_pdi_14', 'insp_tpl_pdi_001', 'Glass and mirrors — no chips or cracks', NULL, 'Exterior', true, 14, NOW()),
  ('ici_pdi_15', 'insp_tpl_pdi_001', 'All exterior lighting operational', 'Headlights, indicators, brake lights, reverse lights', 'Exterior', true, 15, NOW()),
  ('ici_pdi_16', 'insp_tpl_pdi_001', 'Wheels and tyres — correct spec and pressures', NULL, 'Exterior', true, 16, NOW()),
  ('ici_pdi_17', 'insp_tpl_pdi_001', 'Interior trim and upholstery — no damage', NULL, 'Interior', true, 17, NOW()),
  ('ici_pdi_18', 'insp_tpl_pdi_001', 'All electrics functional', 'Windows, locking, infotainment, climate, seats', 'Interior', true, 18, NOW()),
  ('ici_pdi_19', 'insp_tpl_pdi_001', 'No warning lights on dashboard', NULL, 'Interior', true, 19, NOW()),
  ('ici_pdi_20', 'insp_tpl_pdi_001', 'Fluid levels correct — no leaks', 'Oil, coolant, brake fluid, screenwash', 'Mechanical', true, 20, NOW())
ON CONFLICT DO NOTHING;

-- Seed Used Transfer check items
INSERT INTO "InspectionCheckItem" ("id", "templateId", "label", "description", "category", "isRequired", "sortOrder", "updatedAt") VALUES
  ('ici_used_01', 'insp_tpl_used_001', 'V5C logbook present', 'Verify VIN matches vehicle', 'Documents', true, 1, NOW()),
  ('ici_used_02', 'insp_tpl_used_001', 'Service history present', 'Stamped book or digital record', 'Documents', true, 2, NOW()),
  ('ici_used_03', 'insp_tpl_used_001', 'MOT valid and checked', NULL, 'Documents', true, 3, NOW()),
  ('ici_used_04', 'insp_tpl_used_001', 'Master key present', NULL, 'Keys & Equipment', true, 4, NOW()),
  ('ici_used_05', 'insp_tpl_used_001', 'Spare key present', NULL, 'Keys & Equipment', true, 5, NOW()),
  ('ici_used_06', 'insp_tpl_used_001', 'Locking wheel nut key present', NULL, 'Keys & Equipment', true, 6, NOW()),
  ('ici_used_07', 'insp_tpl_used_001', 'Jack and heel brace present', NULL, 'Keys & Equipment', true, 7, NOW()),
  ('ici_used_08', 'insp_tpl_used_001', 'Spare wheel / tyre inflation kit present', NULL, 'Keys & Equipment', false, 8, NOW()),
  ('ici_used_09', 'insp_tpl_used_001', 'Parcel shelf / load cover present', NULL, 'Keys & Equipment', false, 9, NOW()),
  ('ici_used_10', 'insp_tpl_used_001', 'Body panels — damage noted', 'Note all dents, scratches against BVRLA tolerances', 'Condition', true, 10, NOW()),
  ('ici_used_11', 'insp_tpl_used_001', 'Glass and mirrors — no chips or cracks', NULL, 'Condition', true, 11, NOW()),
  ('ici_used_12', 'insp_tpl_used_001', 'Wheels — alloy damage noted', 'Check all 4 wheels for scuffs, cracks', 'Condition', true, 12, NOW()),
  ('ici_used_13', 'insp_tpl_used_001', 'Tyres — tread depth and sidewall condition', 'Min 1.6mm legal, note any damage', 'Condition', true, 13, NOW()),
  ('ici_used_14', 'insp_tpl_used_001', 'Interior condition — no stains or damage', NULL, 'Condition', true, 14, NOW()),
  ('ici_used_15', 'insp_tpl_used_001', 'Warning lights on dashboard', 'Note any active warning lights', 'Condition', true, 15, NOW())
ON CONFLICT DO NOTHING;
