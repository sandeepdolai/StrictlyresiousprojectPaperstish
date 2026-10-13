# Paper Stish — Backend Storage Architecture

This document describes the production storage architecture, the database
migration strategy, the Cloudinary media model, and the operational runbooks
(backup, rollback, cutover). It is the reference for the
`setup/backend-storage-neon-cloudinary` work.

## 1. Responsibilities

| System | Role | What lives there |
| --- | --- | --- |
| **Neon PostgreSQL** | Application database (source of truth for structured data) | User accounts + subscription state, `Publication` snapshots (published websites), `CommunityTemplate` definitions, `DodoWebhookEvent` idempotency records |
| **Cloudinary** | Media storage + CDN delivery | Published website images, template previews, template media assets |
| **Vercel** | Hosting, deployment, protected env config | Next.js app, Preview/Production environment variables |

**Invariants**

- The database is the source of truth only for **published** state. Unpublished
  projects and editor state stay on the user's device (IndexedDB) — the
  device-first model is unchanged by this work.
- Binary media is never stored as base64 inside PostgreSQL in a
  Cloudinary-enabled deployment. The publish API rejects embedded base64
  images (HTTP 422) when `NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_CLOUD_NAME` and
  `..._UPLOAD_PRESET` are both set; normal-template photos are uploaded to
  Cloudinary by the client at publish time (`lib/cloudinaryUpload.ts`).
  The bounded embedded-photo path remains only as a local-development
  fallback when Cloudinary is not configured.
- User fonts embedded in Smart Edit snapshots stay as data URLs by design —
  visitors must not depend on the author's device, and font redistribution
  via Paper Stish hosting raises licensing questions.

## 2. Neon database layout

One Neon project, two isolated branches:

| Branch | Used by | Connection |
| --- | --- | --- |
| `production` (default) | Vercel **Production** | pooled `-pooler` host at runtime; direct host for migrations |
| `development` | Vercel **Preview** + local integration testing | same split |

**Connection rules**

- `DATABASE_URL` — the **pooled** connection (`...-pooler...` host). Used by
  the application runtime (Prisma Client). Serverless functions must pool.
- `DIRECT_URL` — the direct connection (no `-pooler`). Used by Prisma CLI
  (`prisma migrate deploy`) so DDL never runs through PgBouncer transaction
  mode. Set in `prisma/schema.prisma` via `directUrl = env("DIRECT_URL")`.

Both values live only in Vercel's protected environment settings (per
environment) or a local `.env` file that is never committed.

## 3. Migration baseline strategy

**Problem.** The repository's committed migration history started with
`20261008000000_add_template_metadata` (ALTERs on `CommunityTemplate`) —
there was no initial `CREATE TABLE` migration because the first tables were
created with `prisma db push`. Running `prisma migrate deploy` against an
empty database failed on the first ALTER. The last migration
(`20261011000001_clear_test_templates`) is a `DELETE FROM "CommunityTemplate"`
pre-launch cleanup — a no-op on an empty database, but it must never be run
against a database that intentionally holds community templates.

**Fix.** `20260901000000_init` recreates the tables exactly as they were
before the existing ALTERs, making the chain reproducible from scratch:

```
20260901000000_init                          CREATE base tables
20261008000000_add_template_metadata         ALTER CommunityTemplate (+3 cols)
20261011000000_add_dodo_subscription_support ALTER User (+7 cols) + DodoWebhookEvent
20261011000001_clear_test_templates          DELETE (no-op on empty DB)
```

**Verification (repeatable):**

```bash
# 1. Apply the chain to an empty database (isolated branch — never production)
DATABASE_URL=<pooled> DIRECT_URL=<direct> npx prisma migrate deploy

# 2. The migration result must match schema.prisma exactly
npx prisma migrate diff --from-url <direct> --to-schema-datamodel prisma/schema.prisma
# → "No difference detected."

# 3. Structural + data verification through the pooled runtime path
DATABASE_URL=<pooled> npm run db:verify
```

**Existing databases** (the previous Prisma Postgres instance) already have
the full schema; they must be baselined before switching to migrate-based
deployments:

```bash
# On the existing database ONLY (marks the baseline as applied, applies nothing):
DATABASE_URL=<existing> DIRECT_URL=<existing> npx prisma migrate resolve --applied 20260901000000_init
# Then apply/record the later migrations as appropriate for its state.
```

Never run `prisma migrate reset` against Production — it drops all data.

## 4. Environment variables

| Variable | Scope | Notes |
| --- | --- | --- |
| `DATABASE_URL` | server | Neon **pooled** connection for the runtime |
| `DIRECT_URL` | server (CLI) | Neon direct connection for migrations |
| `NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_CLOUD_NAME` | public | Cloudinary cloud (client-side upload-path detection) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | server/CI only | Signed uploads (`/api/uploads/authorize`), media policy, Admin API cleanup + GitHub Actions secrets |
| `CLOUDINARY_SIGNED_UPLOAD_PRESET` | server, optional | Signed-mode preset name (default `paper_stish_signed_uploads`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | server | Authentication (unchanged) |
| `DODO_PAYMENTS_API_KEY` / `DODO_PAYMENTS_PRODUCT_ID` / `DODO_PAYMENTS_WEBHOOK_KEY` / `DODO_PAYMENTS_ENVIRONMENT` | server | Billing (unchanged) |

## 5. Cloudinary media model

Folder taxonomy (dynamic folder mode; folders are organizational, not an
authorization mechanism — authorization is enforced server-side):

```
paper-stish/published-websites/u/{userId}/sites/{projectId}   Smart Edit site media (signed, publish-time)
paper-stish/published-websites/u/{userId}/template-photos     Normal-template photos (signed, publish-time)
paper-stish/templates/{projectId}                              Admin template media (signed, admin-only)
paper-stish/published-websites/{projectId}                     LEGACY (pre-authorization) — read-only grace
paper-stish/published-websites/template-photos                 LEGACY (pre-authorization) — read-only grace
paper-stish/user-assets                                        LEGACY (pre-authorization) — read-only grace
paper-stish/backups                                            Manual backups
```

Upload security (server-authorized signed uploads):

- The browser holds no Cloudinary credentials. Every publish-time upload
  starts with `POST /api/uploads/authorize`: the server resolves the
  signed-in user, restricts the admin namespace to the administrator,
  enforces per-user rolling quotas (default 120/hour, 480/day; grants live
  in the `UploadAuthorization` table), and returns Cloudinary parameters
  (folder + public_id + upload preset + timestamp) signed with the
  server-only `CLOUDINARY_API_SECRET`. Uploads go browser → Cloudinary with
  exactly those parameters; Cloudinary's signature validation rejects any
  added or modified signable parameter, so the destination cannot be altered
  client-side.
- The signed-mode preset `paper_stish_signed_uploads`
  (`unsigned=false`) restricts uploads to raster image formats
  (`jpg, jpeg, png, webp, gif, avif`) — non-image and SVG payloads are
  rejected by Cloudinary before storage. Upload size is bounded by the
  client-side 15 MB input check plus on-device downscaling to ≤1600 px
  before upload, and by the account's plan-level file-size limit. Signed
  uploads can only create assets under the server-chosen folder — they
  cannot read, overwrite by public id, or delete existing assets.
- Publish-time reference policy (`api/publish`): when the server Cloudinary
  credentials are configured, embedded base64 images are rejected, and
  media on the deployment's own cloud must live under the publishing user's
  own namespace (`paper-stish/published-websites/u/{userId}/…`, where the
  signed flow puts them) or a shared legacy namespace. A URL under another
  user's namespace is rejected, so an authorization can never be used to
  publish someone else's assets.
- Administrative operations (inventory, deletion) run only server-side with
  `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` (see
  `scripts/cleanup-cloudinary-template-assets.mjs` and
  `scripts/cleanup-orphaned-published-media.mjs` and their
  confirmation-gated workflows). The orphan cleanup deletes
  `published-websites/` assets that no Publication references and that are
  older than a retention window (default 48h, so in-flight publish sessions
  are never hit).
- The legacy unsigned preset (`paper_stish_uploads`) must be DELETED from
  the Cloudinary account once production serves the signed-upload code, so
  the last unauthenticated upload path disappears.

## 6. Deployments

- **Preview** is wired to the Neon `development` branch and must pass
  `/api/health`, `/api/templates`, and a publish/view smoke test before any
  production change.
- **Production** stays on its current database until the staged cutover
  below completes. Deployments themselves are unchanged (`prisma generate`
  at build; migrations are run explicitly, never as part of the build).

## 7. Production cutover runbook

Preconditions (all verified before switching):

1. The migration chain applies cleanly to the empty Neon `production`
   branch database (`prisma migrate deploy`), and
   `prisma migrate diff --from-url <neon-direct> --to-schema-datamodel prisma/schema.prisma`
   reports no difference.
2. `npm run db:verify` passes against the Neon production branch.
3. Data decision recorded: either (a) the old database holds no data that
   must be preserved (verified by row counts), or (b) a verified export of
   the old data has been restored into Neon and row counts + ownership
   relations match.
4. A final backup of the old database exists and has been restore-tested.

Switch:

1. In Vercel → Project → Settings → Environment Variables, update
   **Production** `DATABASE_URL` (Neon pooled) and `DIRECT_URL` (Neon
   direct). Keep every other variable untouched.
2. Deploy the reviewed commit (or redeploy the latest production build so
   only the environment changes).
3. Smoke test the live site: `/api/health` →
   `{"status":"ok","database":"connected"}`, open an existing published
   website URL, publish + view a test website on the real domain, verify
   `/api/templates`.
4. Watch deployment logs for connection errors.

**Rollback:** restore the previous `DATABASE_URL` value in Vercel and
redeploy. The old database is kept intact (do not delete it) until the new
production database has been stable and verified. Neon branch history also
allows point-in-time restore for the new database if needed.

## 8. Backups

- Neon (Free plan): use branch create/point-in-time restore, or
  `pg_dump`/`pg_restore` against the direct connection string from any
  machine with network access.
- Before any data migration or destructive operation: take a backup,
  record schema version + row counts, restore it into a non-production
  branch, and verify. An unverified backup is not a rollback plan.
