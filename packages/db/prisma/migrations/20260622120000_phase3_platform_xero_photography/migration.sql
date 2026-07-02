-- AlterTable Organisation: profile + feature flags
ALTER TABLE "Organisation" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "vatNumber" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "featureInspection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featurePhotography" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featureFreshScent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featurePaintProtection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featureXero" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Site
ALTER TABLE "Site" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable ServiceType
ALTER TABLE "ServiceType" ADD COLUMN     "nominalCode" TEXT;

-- AlterTable Booking
ALTER TABLE "Booking" ADD COLUMN     "photographyPackage" TEXT;

-- AlterTable Invoice
ALTER TABLE "Invoice" ADD COLUMN     "xeroInvoiceId" TEXT,
ADD COLUMN     "xeroInvoiceNumber" TEXT,
ADD COLUMN     "xeroStatus" TEXT,
ADD COLUMN     "pushedToXeroAt" TIMESTAMP(3);

-- CreateTable PlatformConfig
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable XeroConnection
CREATE TABLE "XeroConnection" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "invoicePrefix" TEXT NOT NULL DEFAULT 'IV-',
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "taxType" TEXT NOT NULL DEFAULT 'OUTPUT2',
    "autoPush" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XeroConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable XeroNominalMapping
CREATE TABLE "XeroNominalMapping" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "xeroAccountCode" TEXT NOT NULL,
    "xeroAccountId" TEXT,
    "xeroAccountName" TEXT,
    "taxType" TEXT NOT NULL DEFAULT 'OUTPUT2',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XeroNominalMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfig_key_key" ON "PlatformConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "XeroConnection_organisationId_key" ON "XeroConnection"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "XeroNominalMapping_organisationId_serviceTypeId_key" ON "XeroNominalMapping"("organisationId", "serviceTypeId");

-- AddForeignKey
ALTER TABLE "XeroConnection" DROP CONSTRAINT IF EXISTS "XeroConnection_organisationId_fkey";
ALTER TABLE "XeroConnection" ADD CONSTRAINT "XeroConnection_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
