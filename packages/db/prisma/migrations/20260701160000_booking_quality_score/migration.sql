-- Add dealer quality score and feedback note to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "qualityNote" TEXT;
