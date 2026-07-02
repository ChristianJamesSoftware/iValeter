-- Add roll tracking fields to Booking
ALTER TABLE "Booking" ADD COLUMN "rollCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "lastRolledAt" TIMESTAMP(3);
