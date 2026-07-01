import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BroadcastFeedbackReply" (
      "id" TEXT NOT NULL,
      "organisationId" TEXT NOT NULL,
      "messageId" TEXT NOT NULL,
      "fromUserId" TEXT NOT NULL,
      "reply" TEXT NOT NULL,
      "siteId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BroadcastFeedbackReply_pkey" PRIMARY KEY ("id")
    )
  `);
  console.log("Created table");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BroadcastFeedbackReply_organisationId_idx" ON "BroadcastFeedbackReply"("organisationId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BroadcastFeedbackReply_fromUserId_idx" ON "BroadcastFeedbackReply"("fromUserId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BroadcastFeedbackReply_createdAt_idx" ON "BroadcastFeedbackReply"("createdAt")
  `);
  console.log("Created indexes");

  // Add FK only if it doesn't exist
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'BroadcastFeedbackReply_fromUserId_fkey'
      ) THEN
        ALTER TABLE "BroadcastFeedbackReply" ADD CONSTRAINT "BroadcastFeedbackReply_fromUserId_fkey"
          FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END
    $$
  `);
  console.log("Added FK constraint");

  console.log("Migration applied successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
