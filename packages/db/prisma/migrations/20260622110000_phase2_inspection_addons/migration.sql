-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "includeInspection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inspectionComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includeFreshScent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paintProtectionTier" TEXT,
ADD COLUMN     "freshScentConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paintProtectionApplied" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "JobPhoto" ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'pre_valet',
ADD COLUMN     "label" TEXT;
