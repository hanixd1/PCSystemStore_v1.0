CREATE TABLE "SecurityRateLimit" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "penaltyLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "SecurityRateLimit_expiresAt_idx" ON "SecurityRateLimit"("expiresAt");
CREATE INDEX "SecurityRateLimit_blockedUntil_idx" ON "SecurityRateLimit"("blockedUntil");
