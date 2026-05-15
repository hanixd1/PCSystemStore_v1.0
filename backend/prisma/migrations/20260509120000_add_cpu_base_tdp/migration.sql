-- Add optional informational base TDP for CPU specifications.
ALTER TABLE "CpuSpecs" ADD COLUMN IF NOT EXISTS "baseTdpWatts" INTEGER;
