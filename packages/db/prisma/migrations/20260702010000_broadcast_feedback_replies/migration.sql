CREATE TABLE IF NOT EXISTS "BroadcastFeedbackReply" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "reply" TEXT NOT NULL,
  "siteId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BroadcastFeedbackReply_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BroadcastFeedbackReply_organisationId_idx" ON "BroadcastFeedbackReply"("organisationId");
CREATE INDEX IF NOT EXISTS "BroadcastFeedbackReply_fromUserId_idx" ON "BroadcastFeedbackReply"("fromUserId");
CREATE INDEX IF NOT EXISTS "BroadcastFeedbackReply_createdAt_idx" ON "BroadcastFeedbackReply"("createdAt");
ALTER TABLE "BroadcastFeedbackReply" DROP CONSTRAINT IF EXISTS "BroadcastFeedbackReply_fromUserId_fkey";
ALTER TABLE "BroadcastFeedbackReply" ADD CONSTRAINT "BroadcastFeedbackReply_fromUserId_fkey"
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
