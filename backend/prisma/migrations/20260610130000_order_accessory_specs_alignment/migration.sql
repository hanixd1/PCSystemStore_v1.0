ALTER TABLE "LaptopCoolingBaseSpecs"
  ADD COLUMN "supportedLaptopSize" TEXT,
  ADD COLUMN "hasRGB" BOOLEAN,
  ADD COLUMN "color" TEXT;

ALTER TABLE "BackpackSpecs"
  ADD COLUMN "supportedLaptopSize" TEXT;
