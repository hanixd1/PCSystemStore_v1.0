CREATE TABLE "LaptopCoolingBaseSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brand" TEXT,
    "fanCount" INTEGER NOT NULL,
    "connectivity" TEXT NOT NULL,
    CONSTRAINT "LaptopCoolingBaseSpecs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackpackSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brand" TEXT,
    "color" TEXT,
    CONSTRAINT "BackpackSpecs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LaptopCoolingBaseSpecs_productId_key" ON "LaptopCoolingBaseSpecs"("productId");
CREATE UNIQUE INDEX "BackpackSpecs_productId_key" ON "BackpackSpecs"("productId");

ALTER TABLE "LaptopCoolingBaseSpecs" ADD CONSTRAINT "LaptopCoolingBaseSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BackpackSpecs" ADD CONSTRAINT "BackpackSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
