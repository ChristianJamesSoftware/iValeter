-- Add activity tracking fields to User
-- lastLoginAt: stamped on every successful login (NULL = never logged in)
-- archivedAt:  soft-delete timestamp (NULL = active)

ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "archivedAt"  TIMESTAMP(3);
