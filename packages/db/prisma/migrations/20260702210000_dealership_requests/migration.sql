-- CreateEnum
CREATE TYPE "DealershipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DealershipRequest" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "status" "DealershipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "dealershipId" TEXT,
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealershipRequest_dealershipId_key" ON "DealershipRequest"("dealershipId");

-- CreateIndex
CREATE INDEX "DealershipRequest_organisationId_idx" ON "DealershipRequest"("organisationId");

-- CreateIndex
CREATE INDEX "DealershipRequest_status_idx" ON "DealershipRequest"("status");

-- AddForeignKey
ALTER TABLE "DealershipRequest" ADD CONSTRAINT "DealershipRequest_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealershipRequest" ADD CONSTRAINT "DealershipRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealershipRequest" ADD CONSTRAINT "DealershipRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
