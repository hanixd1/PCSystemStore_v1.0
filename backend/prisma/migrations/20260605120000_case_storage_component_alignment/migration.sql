ALTER TABLE "CaseSpecs" ADD COLUMN "supportedFormFactors" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CaseSpecs" ADD COLUMN "maxCoolerHeight" INTEGER;
ALTER TABLE "CaseSpecs" ADD COLUMN "radiatorSupportMmValues" TEXT[] DEFAULT ARRAY[]::TEXT[];

