-- Add technical specification tables for new peripheral categories.
CREATE TABLE "WebcamSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brand" TEXT,
    "resolution" TEXT NOT NULL,
    "fps" INTEGER NOT NULL,

    CONSTRAINT "WebcamSpecs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaptureCardSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brand" TEXT,
    "resolution" TEXT NOT NULL,
    "fps" INTEGER NOT NULL,

    CONSTRAINT "CaptureCardSpecs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CableHubSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "brand" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "CableHubSpecs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebcamSpecs_productId_key" ON "WebcamSpecs"("productId");
CREATE UNIQUE INDEX "CaptureCardSpecs_productId_key" ON "CaptureCardSpecs"("productId");
CREATE UNIQUE INDEX "CableHubSpecs_productId_key" ON "CableHubSpecs"("productId");

ALTER TABLE "WebcamSpecs" ADD CONSTRAINT "WebcamSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaptureCardSpecs" ADD CONSTRAINT "CaptureCardSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CableHubSpecs" ADD CONSTRAINT "CableHubSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
