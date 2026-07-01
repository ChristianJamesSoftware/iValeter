-- CreateTable: AddOn (global CSI Sensory Standard add-on catalogue)
CREATE TABLE "AddOn" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DealershipAddOn (per-dealership toggle)
CREATE TABLE "DealershipAddOn" (
    "id"           TEXT NOT NULL,
    "dealershipId" TEXT NOT NULL,
    "addOnId"      TEXT NOT NULL,
    "enabled"      BOOLEAN NOT NULL DEFAULT false,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealershipAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealershipAddOn_dealershipId_addOnId_key" ON "DealershipAddOn"("dealershipId", "addOnId");
CREATE INDEX "DealershipAddOn_dealershipId_idx" ON "DealershipAddOn"("dealershipId");

-- AddForeignKey
ALTER TABLE "DealershipAddOn" ADD CONSTRAINT "DealershipAddOn_dealershipId_fkey"
    FOREIGN KEY ("dealershipId") REFERENCES "Dealership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DealershipAddOn" ADD CONSTRAINT "DealershipAddOn_addOnId_fkey"
    FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
