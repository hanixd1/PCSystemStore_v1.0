-- Existing products remain active after deployment. Products identified as legacy
-- must be explicitly deactivated after reviewing the dry-run diagnostic report.
ALTER TABLE "Product"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Product_isActive_deletedAt_idx" ON "Product"("isActive", "deletedAt");
