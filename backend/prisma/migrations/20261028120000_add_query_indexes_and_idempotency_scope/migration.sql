-- Indexes for the catalog, order history, payments, addresses and audit queries.
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Address_userId_idx" ON "Address"("userId");
CREATE INDEX "ActionLog_module_createdAt_idx" ON "ActionLog"("module", "createdAt");

-- Idempotency keys are scoped per user: the same key sent by two users no longer collides.
ALTER TABLE "IdempotencyKey" ADD COLUMN "userScope" TEXT NOT NULL DEFAULT 'anonymous';
UPDATE "IdempotencyKey" SET "userScope" = "userId" WHERE "userId" IS NOT NULL;
DROP INDEX "IdempotencyKey_key_route_method_key";
CREATE UNIQUE INDEX "IdempotencyKey_userScope_key_route_method_key" ON "IdempotencyKey"("userScope", "key", "route", "method");
