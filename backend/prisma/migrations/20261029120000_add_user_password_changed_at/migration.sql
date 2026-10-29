-- Sessions issued before a password change are rejected by JwtAuthGuard.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
