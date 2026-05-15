-- Add optional controlled brand for cooler specifications.
ALTER TABLE "CoolerSpecs" ADD COLUMN IF NOT EXISTS "brand" TEXT;
