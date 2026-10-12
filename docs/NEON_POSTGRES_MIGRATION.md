# Paper Stish — Safe Neon Postgres Migration Runbook

## Goal

Move the application's PostgreSQL database from Vercel Prisma Postgres to Neon while keeping Cloudinary as the file/media store. Do not switch production traffic until the Neon database is verified.

## Current repository findings (verified from main)

- `prisma/schema.prisma` uses PostgreSQL and `env("DATABASE_URL")`.
- Models currently include `User`, `Post`, `Publication`, `CommunityTemplate`, and `DodoWebhookEvent`.
- `Publication.data` stores the published website snapshot. Unpublished editing stays device-local.
- Cloudinary remains the home for image/media assets. Do not migrate media into Postgres.
- The committed migration directory currently contains:
  - `20261008000000_add_template_metadata` (ALTERs `CommunityTemplate`)
  - `20261011000000_add_dodo_subscription_support` (ALTERs `User`, creates `DodoWebhookEvent`)
  - `20261011000001_clear_test_templates` (runs `DELETE FROM "CommunityTemplate"`)
- There is no initial migration creating the base tables in the currently visible migration directory. Therefore, do **not** blindly run `prisma migrate deploy` against a brand-new empty Neon database: the existing migration history may not create the complete schema and may fail on missing tables.
- The final migration deletes all community template rows. Never apply it to an existing database without confirming that deletion is intended. On a newly provisioned empty database it is unnecessary as a data-cleanup operation.

## Required migration plan

### Phase 1 — Provision Neon (manual account step)

1. Create a Neon project named `paper-stish-db` on the Free plan.
2. Select a region close to the Vercel deployment region.
3. Create separate Neon branches/databases for development/preview and production if available within the plan.
4. Keep the current Prisma Postgres database unchanged until cutover and rollback checks pass.
5. Never paste connection strings into source code, GitHub, logs, or AI chat.

### Phase 2 — Configure a non-production connection first

1. In Neon, copy the connection string for the **preview/test** database.
2. Add it to the Vercel project's Preview-only `DATABASE_URL` environment variable using Vercel's secret UI/CLI. Do not replace Production `DATABASE_URL` yet.
3. If using a pooled Neon URL for application runtime, ensure the Prisma schema and migration workflow also have a supported direct connection for migrations (commonly a separate `DIRECT_URL`). Update `prisma/schema.prisma` only after verifying the installed Prisma version's supported datasource configuration.
4. Keep connection strings in secret storage. Do not expose them in client-prefixed variables.

### Phase 3 — Establish the schema safely

1. Inspect the current Prisma Postgres schema and migration history read-only. Record table names, row counts, schema version, and whether production contains any user/publication/payment records.
2. Inspect all migration SQL before execution. Explicitly review `20261011000001_clear_test_templates`; it is destructive to `CommunityTemplate`.
3. Compare the complete `schema.prisma` with the actual source schema and committed migrations. The repository currently appears to lack an initial create-tables migration, so choose a verified baseline strategy before running migrations on Neon.
4. For a truly empty Neon database, build the schema from the current Prisma schema using a controlled, reviewed process, then reconcile Prisma migration history so future migrations run exactly once. Do not blindly mix `prisma db push` with existing migrations without a documented baseline plan.
5. If production has records that must be retained, copy data using a verified export/import procedure, preserve IDs and unique constraints, and compare row counts plus key relationships. Do not copy payment secrets or log private user content.
6. Take a backup before any data copy or cutover and prove that the backup can be restored into a non-production database.

### Phase 4 — Preview verification

- Run Prisma Client generation, typecheck, lint, and production build.
- Verify DB connectivity without printing connection strings.
- Test signup/login, account lookup, template listing, publishing, viewing published URLs, republishing the same `templateId`, ownership checks, and Dodo webhook idempotency.
- Verify Cloudinary upload and published-media URLs still work. Cloudinary folders and asset IDs should not be moved or deleted as part of the database migration.
- Confirm existing local drafts remain local and are not uploaded automatically.
- Review preview logs for connection-pool exhaustion, migration errors, or missing tables.

### Phase 5 — Production cutover (only after approval and passing tests)

1. Take and verify a final backup of the current production database.
2. Confirm whether any real production rows exist and whether they have been copied and validated.
3. Update Production `DATABASE_URL` (and the direct migration URL if configured) in Vercel to Neon, using secret storage only.
4. Deploy a reviewed commit and run smoke tests against the live domain.
5. Keep the old Prisma Postgres database intact for rollback. If health checks fail, restore the old environment-variable configuration and redeploy/rollback.
6. Do not delete the old database until the new production database has been stable and backups have been verified.

## Acceptance criteria

- [ ] Neon Free project exists and connection works from Preview.
- [ ] A complete schema/baseline strategy is reviewed; no missing-table migration failure.
- [ ] Data retention/copy decision is based on actual row counts.
- [ ] Backup restore test succeeds.
- [ ] Preview tests pass, including publication and Dodo webhook paths.
- [ ] Cloudinary behavior remains unchanged.
- [ ] Production cutover is verified and rollback remains possible.
- [ ] No connection strings or credentials are committed or printed.
