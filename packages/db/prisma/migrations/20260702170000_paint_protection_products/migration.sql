-- CreateTable: PaintProtectionProduct
CREATE TABLE IF NOT EXISTS "PaintProtectionProduct" (
    "id"              TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "durationMonths"  INTEGER NOT NULL,
    "guaranteeNote"   TEXT,
    "priceGbp"        DOUBLE PRECISION NOT NULL,
    "applicationMins" INTEGER NOT NULL DEFAULT 0,
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"       INTEGER NOT NULL DEFAULT 0,
    "popular"         BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaintProtectionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaintProtectionProduct_isActive_sortOrder_idx" ON "PaintProtectionProduct"("isActive", "sortOrder");

-- Add paintProtectionProductId to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paintProtectionProductId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paintProtectionProductId_fkey"
    FOREIGN KEY ("paintProtectionProductId") REFERENCES "PaintProtectionProduct"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex on Booking
CREATE INDEX IF NOT EXISTS "Booking_paintProtectionProductId_idx" ON "Booking"("paintProtectionProductId");
