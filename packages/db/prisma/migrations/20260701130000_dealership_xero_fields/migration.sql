-- AlterTable: add Xero contact fields to Dealership
ALTER TABLE "Dealership" ADD COLUMN "xeroContactId" TEXT;
ALTER TABLE "Dealership" ADD COLUMN "xeroContactName" TEXT;
