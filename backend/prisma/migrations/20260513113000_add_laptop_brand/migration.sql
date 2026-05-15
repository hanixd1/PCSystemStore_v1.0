-- Add optional controlled brand for laptop specifications.
ALTER TABLE "LaptopSpecs" ADD COLUMN IF NOT EXISTS "brand" TEXT;
