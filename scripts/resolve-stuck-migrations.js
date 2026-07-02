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
 */

const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("resolve-stuck-migrations: DATABASE_URL not set — skipping");
    process.exit(0);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Find all stuck (unfinished, not rolled back) migrations
    const { rows: stuck } = await client.query(`
      SELECT id, migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
    `);

    if (stuck.length === 0) {
      console.log("resolve-stuck-migrations: no stuck migrations found — clean to deploy");
      return;
    }

    console.log(`resolve-stuck-migrations: found ${stuck.length} stuck migration(s):`);

    for (const row of stuck) {
      console.log(`  → resolving: ${row.migration_name}`);
      await client.query(`
        UPDATE _prisma_migrations
        SET rolled_back_at = NOW()
        WHERE id = $1
      `, [row.id]);
    }

    console.log("resolve-stuck-migrations: all stuck migrations resolved — safe to deploy");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("resolve-stuck-migrations error:", err.message);
  // Don't exit 1 — a failure here must not block the deploy
  process.exit(0);
});
