-- Preserve legacy height metadata while introducing an explicit tower-cooler capability.
-- Existing cases default to true so current catalog products remain compatible.
ALTER TABLE "CaseSpecs" ADD COLUMN "supportsTowerCooler" BOOLEAN NOT NULL DEFAULT true;
