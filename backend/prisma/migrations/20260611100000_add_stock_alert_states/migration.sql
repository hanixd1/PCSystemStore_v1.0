CREATE TABLE "StockAlertState" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "alertType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "reviewedByUserId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StockAlertState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockAlertState_productId_alertType_key"
  ON "StockAlertState"("productId", "alertType");

CREATE INDEX "StockAlertState_status_idx"
  ON "StockAlertState"("status");

CREATE INDEX "StockAlertState_reviewedByUserId_idx"
  ON "StockAlertState"("reviewedByUserId");

ALTER TABLE "StockAlertState"
  ADD CONSTRAINT "StockAlertState_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockAlertState"
  ADD CONSTRAINT "StockAlertState_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
