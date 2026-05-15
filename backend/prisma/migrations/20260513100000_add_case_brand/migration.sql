-- Add optional controlled brand for case specifications.
ALTER TABLE "CaseSpecs" ADD COLUMN IF NOT EXISTS "brand" TEXT;
