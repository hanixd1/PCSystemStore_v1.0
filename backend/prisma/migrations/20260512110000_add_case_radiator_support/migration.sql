-- Add optional liquid radiator support size for case specifications.
ALTER TABLE "CaseSpecs" ADD COLUMN IF NOT EXISTS "radiatorSupportMm" INTEGER;
