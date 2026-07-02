-- Add logoUrl to Dealership
ALTER TABLE "Dealership" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
