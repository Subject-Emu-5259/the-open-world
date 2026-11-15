// THE OPEN WORLD — standalone migration runner (TOW PC phase 2).
//
//   DATABASE_URL=... node dist/pc/server/migrate.cjs
//
// Applies backend/migrations/001_init.sql (idempotent) and exits.
// The production entry (pc-backend.ts) runs the same migration on
// boot, so this script is for manual / CI use — applying the schema
// ahead of a deploy, or verifying a database by hand. It never
// writes game data, only the schema.

import { createPostgresPool, runMigrations } from "./postgres-store.js";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[tow-migrate] DATABASE_URL is not set — refusing to run without a target database.");
    process.exit(1);
  }
  const pool = createPostgresPool(databaseUrl);
  try {
    await runMigrations(pool);
    console.log("[tow-migrate] Migration 001_init applied (idempotent — safe to re-run).");
  } catch (err) {
    console.error("[tow-migrate] Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
