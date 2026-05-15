-- Add optional controlled brand for monitor specifications.
ALTER TABLE "MonitorSpecs" ADD COLUMN IF NOT EXISTS "brand" TEXT;
