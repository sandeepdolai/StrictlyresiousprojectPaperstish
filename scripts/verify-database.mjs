#!/usr/bin/env node
/**
 * Paper Stish — database verification.
 *
 * Connects with DATABASE_URL (the same pooled connection the application
 * runtime uses) and verifies that the schema created by the Prisma migration
 * chain is complete: expected tables, unique constraints, indexes and the
 * User→Publication ownership relation. Prints row counts for a quick data
 * inventory. Never prints connection strings.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/verify-database.mjs
 *
 * Exit codes: 0 = verified, 1 = missing objects, 2 = connection failure.
 */
import { PrismaClient } from "@prisma/client";

const EXPECTED_TABLES = [
  "User",
  "Post",
  "Publication",
  "CommunityTemplate",
  "DodoWebhookEvent",
];

const EXPECTED_INDEXES = [
  { table: "User", name: "User_email_key", unique: true },
  { table: "Publication", name: "Publication_templateId_key", unique: true },
  { table: "Publication", name: "Publication_ownerId_idx", unique: false },
  { table: "CommunityTemplate", name: "CommunityTemplate_slug_key", unique: true },
  { table: "CommunityTemplate", name: "CommunityTemplate_published_publishedAt_idx", unique: false },
  { table: "User", name: "User_dodoSubscriptionId_key", unique: true },
];

const EXPECTED_FKS = [
  { table: "Publication", name: "Publication_ownerId_fkey" },
];

function maskError(error) {
  const message = error instanceof Error ? error.message : String(error);
  // Strip anything that looks like a connection string.
  return message.replace(/[a-z]+:\/\/[^\s"']+/gi, "<redacted-url>");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(2);
  }

  const db = new PrismaClient({ log: ["error"] });
  try {
    await db.$connect();

    const tables = await db.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const tableNames = tables.map((t) => t.tablename);
    const missingTables = EXPECTED_TABLES.filter((t) => !tableNames.includes(t));
    console.log(`Tables found: ${tableNames.sort().join(", ")}`);
    if (missingTables.length) {
      console.error(`MISSING TABLES: ${missingTables.join(", ")}`);
      process.exitCode = 1;
    }

    const indexes = await db.$queryRaw`
      SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public'
    `;
    const indexByName = new Map(indexes.map((i) => [i.indexname, i.tablename]));
    const missingIndexes = EXPECTED_INDEXES.filter(
      (i) => indexByName.get(i.name) !== i.table,
    );
    if (missingIndexes.length) {
      console.error(
        `MISSING INDEXES/CONSTRAINTS: ${missingIndexes.map((i) => `${i.table}.${i.name}`).join(", ")}`,
      );
      process.exitCode = process.exitCode ?? 1;
    } else {
      console.log(
        `Indexes/constraints verified: ${EXPECTED_INDEXES.map((i) => i.name).join(", ")}`,
      );
    }

    const fks = await db.$queryRaw`
      SELECT conname, conrelid::regclass::text AS tablename
      FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    `;
    const fkByName = new Map(
      fks.map((f) => [f.conname, f.tablename.replace(/"/g, "").toLowerCase()]),
    );
    const missingFks = EXPECTED_FKS.filter(
      (f) => fkByName.get(f.name) !== f.table.toLowerCase(),
    );
    if (missingFks.length) {
      console.error(
        `MISSING FOREIGN KEYS: ${missingFks.map((f) => `${f.table}.${f.name}`).join(", ")}`,
      );
      process.exitCode = process.exitCode ?? 1;
    } else {
      console.log(`Foreign keys verified: ${EXPECTED_FKS.map((f) => f.name).join(", ")}`);
    }

    const [userCount] = await db.$queryRaw`SELECT COUNT(*)::int AS n FROM "User"`;
    const [publicationCount] = await db.$queryRaw`SELECT COUNT(*)::int AS n FROM "Publication"`;
    const [templateCount] = await db.$queryRaw`SELECT COUNT(*)::int AS n FROM "CommunityTemplate"`;
    const [webhookCount] = await db.$queryRaw`SELECT COUNT(*)::int AS n FROM "DodoWebhookEvent"`;
    console.log(
      `Row counts — users: ${userCount.n}, publications: ${publicationCount.n}, communityTemplates: ${templateCount.n}, dodoWebhookEvents: ${webhookCount.n}`,
    );

    // Ownership relation sanity: every publication references an existing user.
    const [orphans] = await db.$queryRaw`
      SELECT COUNT(*)::int AS n FROM "Publication" p
      LEFT JOIN "User" u ON u.id = p."ownerId"
      WHERE u.id IS NULL
    `;
    if (orphans.n !== 0) {
      console.error(`DATA ERROR: ${orphans.n} publications have a missing owner.`);
      process.exitCode = process.exitCode ?? 1;
    } else {
      console.log("Ownership relation verified: no orphaned publications.");
    }

    if (!process.exitCode) console.log("Database verification: OK");
  } catch (error) {
    console.error("Database verification FAILED:", maskError(error));
    process.exit(2);
  } finally {
    await db.$disconnect().catch(() => {});
  }
}

main();
