-- Add GPU assembler brand and separated power fields.
ALTER TABLE "GpuSpecs" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "GpuSpecs" ADD COLUMN IF NOT EXISTS "gpuPowerWatts" INTEGER;
ALTER TABLE "GpuSpecs" ADD COLUMN IF NOT EXISTS "recommendedPsuWatts" INTEGER;

-- Backfill real GPU power from the historical TDP/consumption column.
UPDATE "GpuSpecs"
SET "gpuPowerWatts" = "tdp"
WHERE "gpuPowerWatts" IS NULL;
