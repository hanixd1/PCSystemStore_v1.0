ALTER TABLE "HeadsetSpecs"
ADD COLUMN "brand" TEXT,
ADD COLUMN "supportedConnections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
