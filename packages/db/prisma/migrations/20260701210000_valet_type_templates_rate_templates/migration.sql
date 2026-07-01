-- ValetTypeTemplate: platform master valet type library
CREATE TABLE IF NOT EXISTS "ValetTypeTemplate" (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category "ServiceCategory" NOT NULL DEFAULT 'VALET',
  "defaultDurationMins" INTEGER NOT NULL DEFAULT 60,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- RateTemplate: platform master rate templates
CREATE TABLE IF NOT EXISTS "RateTemplate" (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

-- RateTemplateLine: per-service-type lines within a rate template
CREATE TABLE IF NOT EXISTS "RateTemplateLine" (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "templateId" TEXT NOT NULL,
  "serviceTypeName" TEXT NOT NULL,
  "basePricePence" INTEGER NOT NULL,
  "baseAllocMins" INTEGER NOT NULL DEFAULT 60,
  "pctSmall" INTEGER NOT NULL DEFAULT -10,
  "pctMedium" INTEGER NOT NULL DEFAULT 0,
  "pctLarge" INTEGER NOT NULL DEFAULT 20,
  "pctXL" INTEGER NOT NULL DEFAULT 35,
  "pctVan" INTEGER NOT NULL DEFAULT 50,
  UNIQUE("templateId", "serviceTypeName"),
  FOREIGN KEY ("templateId") REFERENCES "RateTemplate"(id) ON DELETE CASCADE
);
