ALTER TABLE "CableHubSpecs"
ADD COLUMN "cableType" TEXT,
ADD COLUMN "cableLengthMeters" INTEGER,
ADD COLUMN "hubInputType" TEXT,
ADD COLUMN "hasHdmiOutput" BOOLEAN,
ADD COLUMN "hasRj45Output" BOOLEAN;
