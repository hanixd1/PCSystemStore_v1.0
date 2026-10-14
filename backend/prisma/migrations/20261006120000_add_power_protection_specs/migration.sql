-- Specs for the UPS and STABILIZER categories (replace the spec-less PROTECTION category).
CREATE TABLE "PowerProtectionSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brand" TEXT,
    "outletType" TEXT,
    "wattage" INTEGER,

    CONSTRAINT "PowerProtectionSpecs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PowerProtectionSpecs_productId_key" ON "PowerProtectionSpecs"("productId");

ALTER TABLE "PowerProtectionSpecs" ADD CONSTRAINT "PowerProtectionSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
