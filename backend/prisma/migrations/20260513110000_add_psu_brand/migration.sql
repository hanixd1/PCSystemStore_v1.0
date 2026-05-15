-- Add optional controlled brand for PSU specifications.
ALTER TABLE "PsuSpecs" ADD COLUMN IF NOT EXISTS "brand" TEXT;
