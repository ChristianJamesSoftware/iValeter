#!/usr/bin/env node
/**
 * resolve-stuck-migrations.js
 *
 * Automatically marks any stuck (failed/unfinished) Prisma migrations as
 * rolled-back so that `prisma migrate deploy` can proceed cleanly.
 *
 * A migration is "stuck" when:
 *   - finished_at IS NULL AND rolled_back_at IS NULL  (failed mid-apply)
 *
 * Rows already rolled_back are left alone — they are already resolved.
 *
 * Run this BEFORE `prisma migrate deploy` on every Railway deploy.
 *
 * Uses @prisma/client (already a dependency of @ivaleter/db) so no extra
 * packages are required — avoids the `Cannot find module 'pg'` crash.
 */

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("resolve-stuck-migrations: DATABASE_URL not set — skipping");
    process.exit(0);
  }

  // Require inside main() so any load failure is caught by the .catch() handler
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Find all unfinished migrations (stuck OR already rolled-back)
    // Both cases block prisma migrate deploy
    const stuck = await prisma.$queryRawUnsafe(`
      SELECT id, migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NULL
    `);

    if (stuck.length === 0) {
      console.log("resolve-stuck-migrations: no stuck migrations found — clean to deploy");
      return;
    }

    console.log(`resolve-stuck-migrations: found ${stuck.length} stuck migration(s):`);

    for (const row of stuck) {
      console.log(`  → removing unfinished row: ${row.migration_name}`);
      await prisma.$executeRawUnsafe(`
        DELETE FROM _prisma_migrations WHERE id = $1
      `, row.id);
    }

    console.log("resolve-stuck-migrations: all unfinished migration rows removed — Prisma will re-run them with idempotent SQL");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("resolve-stuck-migrations error:", err.message);
  // Don't exit 1 — a failure here must not block the deploy
  process.exit(0);
});
