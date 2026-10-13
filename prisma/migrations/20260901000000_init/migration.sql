-- Baseline schema for Paper Stish (repository history before this file had no
-- initial migration: the first tables were created with `prisma db push`, and
-- the committed history started at 20261008000000_add_template_metadata with
-- ALTERs against tables that did not exist for a fresh database).
--
-- This migration recreates the tables EXACTLY as they were before those
-- ALTERs so the subsequent migrations apply cleanly and the whole chain can
-- provision a complete schema on an empty PostgreSQL database (Neon):
--
--   20260901000000_init                        (this file — CREATE tables)
--   20261008000000_add_template_metadata       (ALTER CommunityTemplate)
--   20261011000000_add_dodo_subscription_support (ALTER User + DodoWebhookEvent)
--   20261011000001_clear_test_templates        (DELETE — no-op on empty DB)
--
-- It is a pure baseline: no data statements, no destructive operations.
-- Verified against prisma/schema.prisma with:
--   prisma migrate diff --from-migrations --to-schema-datamodel

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "viewerName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Paper Stish',
    "data" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "assets" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_templateId_key" ON "Publication"("templateId");

-- CreateIndex
CREATE INDEX "Publication_ownerId_idx" ON "Publication"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityTemplate_slug_key" ON "CommunityTemplate"("slug");

-- CreateIndex
CREATE INDEX "CommunityTemplate_published_publishedAt_idx" ON "CommunityTemplate"("published", "publishedAt");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
