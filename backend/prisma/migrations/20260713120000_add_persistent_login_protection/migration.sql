ALTER TABLE "User"
ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "failedLoginWindowStartedAt" TIMESTAMP(3),
ADD COLUMN "lockedUntil" TIMESTAMP(3),
ADD COLUMN "lastFailedLoginAt" TIMESTAMP(3),
ADD COLUMN "lastSuccessfulLoginAt" TIMESTAMP(3);
