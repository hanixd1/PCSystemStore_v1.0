-- Add optional brand field for motherboard technical specifications.
ALTER TABLE "MotherboardSpecs" ADD COLUMN IF NOT EXISTS "brand" TEXT;
