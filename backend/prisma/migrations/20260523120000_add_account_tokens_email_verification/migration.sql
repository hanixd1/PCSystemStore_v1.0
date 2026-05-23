-- CreateEnum
CREATE TYPE "AccountTokenType" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION', 'SET_PASSWORD');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Mark existing active accounts as verified to avoid locking out current production users.
UPDATE "User"
SET "emailVerified" = true,
    "emailVerifiedAt" = COALESCE("emailVerifiedAt", CURRENT_TIMESTAMP)
WHERE "emailVerified" = false;

-- CreateTable
CREATE TABLE "AccountToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "AccountTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountToken_tokenHash_key" ON "AccountToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountToken_userId_type_idx" ON "AccountToken"("userId", "type");

-- CreateIndex
CREATE INDEX "AccountToken_type_expiresAt_idx" ON "AccountToken"("type", "expiresAt");

-- AddForeignKey
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
