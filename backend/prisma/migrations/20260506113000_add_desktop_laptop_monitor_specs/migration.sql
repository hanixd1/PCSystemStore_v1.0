ALTER TABLE "LaptopSpecs" ADD COLUMN "includesWindows" BOOLEAN;

ALTER TABLE "DesktopSpecs" ADD COLUMN "coolerType" TEXT;
ALTER TABLE "DesktopSpecs" ADD COLUMN "psuWatts" INTEGER;
ALTER TABLE "DesktopSpecs" ADD COLUMN "caseModel" TEXT;

ALTER TABLE "MonitorSpecs" ADD COLUMN "responseTimeMs" DOUBLE PRECISION;
ALTER TABLE "MonitorSpecs" ADD COLUMN "ports" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MonitorSpecs" ADD COLUMN "hasSpeakers" BOOLEAN;
