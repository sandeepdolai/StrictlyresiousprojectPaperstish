# Paper Stish AI Storage Agent — Implementation Plan

## Goal

Build a persistent AI agent that operates Paper Stish's storage backend across GitHub, Cloudinary, Prisma Postgres, and Vercel. The agent should inspect before acting, implement changes, run checks, and deploy verified changes without routine human approval.

This document is a setup contract, not a claim that the agent runtime is already deployed.

## Current architecture discovered in the application

- The application uses Next.js and Prisma.
- `prisma/schema.prisma` uses PostgreSQL through `DATABASE_URL`.
- Prisma models include `User`, `Publication`, and `CommunityTemplate`.
- `Publication.data` stores the published website snapshot. The repository documents that unpublished editing projects stay device-local and reach the server only on publish.
- `.env.example` describes Cloudinary client uploads through an unsigned upload preset and identifies `paper-stish/user-assets`.
- The production Vercel project is `the-seriouseast-startup`.
- Vercel currently has the database URL variables and the public Cloudinary cloud-name/upload-preset variables configured. Do not expose, log, or copy their values.

## Intended responsibilities

1. **Repository maintenance**
   - Inspect source and configuration before changing them.
   - Work on a dedicated branch, run typecheck/lint/build and relevant tests, and produce a reviewable diff.
   - Deploy only a verified commit; retain the previous known-good deployment for rollback.
2. **Cloudinary**
   - Inventory resources and compare public IDs/URLs against code and database references.
   - Use consistent logical prefixes for official photo templates, official website templates, library assets, user uploads, published assets, and backups.
   - Do not move or delete an asset until its references are checked and a recoverable backup exists.
3. **Postgres**
   - Inspect schema and data before proposing migrations.
   - Prefer additive, reversible migrations; never run `prisma migrate reset` or destructive schema operations against production.
   - Use transactions for multi-record updates where supported and verify row counts before and after changes.
4. **Publishing**
   - Preserve the device-first editing model: unpublished drafts remain local unless the product explicitly adds cloud drafts.
   - Store published website snapshots and ownership metadata in Postgres; store media in Cloudinary.
   - Validate uploaded asset ownership and content before publishing.
5. **Vercel**
   - Check preview deployment/build output before production.
   - Verify production health after deploy and roll back to the last healthy deployment if verification fails.
6. **Observability**
   - Emit a concise run report: changes, checks, resources affected, storage usage, failures, and rollback status.
   - Never log credentials, signed URLs containing secrets, or full private user content.

## Agent runtime recommendation

Use a separate, persistent agent runtime (Vercel's `eve` framework is the preferred starting point) rather than placing an unrestricted autonomous loop inside the public Paper Stish web application. The agent should have typed, narrowly scoped tools for repository operations, Cloudinary inventory/organization, read/write database tasks, tests, deployment, and health checks.

Do not implement tool APIs from memory: initialize the supported agent framework, then follow the documentation shipped with the installed version.

## Required connected credentials

Configure these in the agent runtime's secret store or Vercel environment settings; never commit them to the repository and never paste them into chat.

- Model access: Vercel AI Gateway credentials/configuration, or a chosen model provider credential.
- GitHub: a repository-scoped GitHub App or fine-grained token with contents/PR/workflow permissions needed by the agent.
- Cloudinary: server-side API credentials with asset-management permissions. Do not use an unsigned client upload preset as an admin credential.
- Postgres: a dedicated agent database role. Start read-only; enable writes only after backup/restore and migration checks exist. Avoid sharing an unrestricted owner credential.
- Vercel: a scoped token for the intended team/project and deployment operations.
- Optional backup destination: a separate durable destination from the production database and Cloudinary account.

The current Vercel app's environment variables are not automatically available to a separate agent service. Connect each service explicitly and verify each connection without printing secret values.

## Operating policy

### Autonomous by default
The agent may independently inventory, analyze, edit code on its working branch, run tests, create preview deployments, organize newly created assets into approved folders, perform idempotent repairs, and deploy a verified change when all automated checks pass.

### Required safeguards
- Take and verify a backup before destructive or bulk operations.
- Maintain a manifest of resource identifiers and planned changes.
- Use dry-run mode for bulk asset operations and database migrations first.
- Never delete assets solely because they look old, duplicated, or unused; prove there are no code/database/publication references.
- Never delete user-owned content or reset production data as routine cleanup.
- Do not alter authentication, payment state, domain ownership, account access, or security settings as a storage maintenance side effect.
- Stop and report if backups fail, ownership is ambiguous, migration checks fail, or production health degrades.
- Keep an audit trail with timestamps and resource IDs, but no secrets or sensitive payloads.

## Rollout phases

1. **Read-only discovery:** inventory repository, environment-variable names (not values), Cloudinary assets, database schema/metadata, and deployment health.
2. **Backup and baseline:** create a restorable backup plan; record asset IDs, public IDs, database schema/version, and current production deployment.
3. **Implementation:** create the agent runtime and typed tools; add unit tests, integration tests, dry-run support, and a run report.
4. **Preview validation:** use a non-production database/credentials and Cloudinary test prefix; verify upload, publish, republish, ownership, and rollback.
5. **Production autonomy:** grant production write permissions only after the previous phases pass; allow routine verified deployments and reversible maintenance.
6. **Scheduled maintenance:** start with a daily read-only health/inventory run. Enable writes only for well-tested idempotent tasks.

## Acceptance checklist

- [ ] The agent runtime is deployed and its persistent execution/scheduling is verified.
- [ ] GitHub, Cloudinary, Postgres, and Vercel connections are verified without exposing secrets.
- [ ] A backup has been restored successfully in a non-production environment.
- [ ] Asset references are reconciled with database records and repository code.
- [ ] Upload and publish flows pass integration tests.
- [ ] Failed deployment health checks trigger rollback and a report.
- [ ] Audit logs and a pause/kill switch exist.
- [ ] Production write access is enabled only after all checks pass.
