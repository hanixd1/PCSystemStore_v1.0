ALTER TABLE "CpuSpecs" ADD COLUMN "brand" TEXT;
ALTER TABLE "CpuSpecs" ADD COLUMN "threads" INTEGER;

ALTER TABLE "MotherboardSpecs" ADD COLUMN "supportedM2FormFactors" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "CoolerSpecs" ADD COLUMN "compatibleSockets" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CoolerSpecs" ADD COLUMN "coolerHeight" INTEGER;

ALTER TABLE "StorageSpecs" ADD COLUMN "writeSpeed" INTEGER;
ALTER TABLE "StorageSpecs" ADD COLUMN "m2FormFactor" TEXT;
