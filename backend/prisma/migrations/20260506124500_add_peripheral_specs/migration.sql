ALTER TABLE "KeyboardSpecs" ADD COLUMN "brand" TEXT;
ALTER TABLE "KeyboardSpecs" ADD COLUMN "keyboardType" TEXT;
ALTER TABLE "KeyboardSpecs" ADD COLUMN "connections" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "KeyboardSpecs" ADD COLUMN "layoutLanguage" TEXT;
ALTER TABLE "KeyboardSpecs" ADD COLUMN "hasLighting" BOOLEAN;
ALTER TABLE "KeyboardSpecs" ADD COLUMN "keyboardFormFactor" TEXT;
ALTER TABLE "KeyboardSpecs" ADD COLUMN "weightGrams" INTEGER;

ALTER TABLE "MouseSpecs" ADD COLUMN "brand" TEXT;
ALTER TABLE "MouseSpecs" ADD COLUMN "mouseType" TEXT;
ALTER TABLE "MouseSpecs" ADD COLUMN "connections" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MouseSpecs" ADD COLUMN "buttonCount" INTEGER;
ALTER TABLE "MouseSpecs" ADD COLUMN "pollingRateHz" INTEGER;

CREATE TABLE "MousepadSpecs" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "brand" TEXT,
  "widthCm" INTEGER,
  "lengthCm" INTEGER,
  "hasLed" BOOLEAN,
  CONSTRAINT "MousepadSpecs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MousepadSpecs_productId_key" ON "MousepadSpecs"("productId");

ALTER TABLE "MousepadSpecs"
  ADD CONSTRAINT "MousepadSpecs_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ChairSpecs" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "brand" TEXT,
  "color" TEXT,
  "material" TEXT,
  "maxWeightKg" INTEGER,
  CONSTRAINT "ChairSpecs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChairSpecs_productId_key" ON "ChairSpecs"("productId");

ALTER TABLE "ChairSpecs"
  ADD CONSTRAINT "ChairSpecs_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GamingDeskSpecs" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "brand" TEXT,
  "color" TEXT,
  "surface" TEXT,
  "weightKg" INTEGER,
  CONSTRAINT "GamingDeskSpecs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GamingDeskSpecs_productId_key" ON "GamingDeskSpecs"("productId");

ALTER TABLE "GamingDeskSpecs"
  ADD CONSTRAINT "GamingDeskSpecs_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
