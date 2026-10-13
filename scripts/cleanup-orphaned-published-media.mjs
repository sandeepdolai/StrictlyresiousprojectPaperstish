#!/usr/bin/env node

/**
 * Safely remove ORPHANED published-website media from Cloudinary.
 *
 * An asset is an orphan when ALL of these hold:
 *   1. it lives under paper-stish/published-websites/ (user publish media —
 *      this script never touches paper-stish/templates/ or other folders),
 *   2. its public_id is not referenced by ANY Publication row (the media
 *      references live inside the publication data JSON), and
 *   3. it is older than the retention window (default 48h) so in-flight
 *      publish sessions (upload → publish can take a while) are never hit.
 *
 * References are read from the database (DATABASE_URL, read-only queries);
 * assets are listed via the Cloudinary Admin API. Without --confirm this is
 * a dry run that prints what would be deleted.
 *
 * Required environment variables:
 *   DATABASE_URL                    (read-only access is enough)
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 * Optional:
 *   ORPHAN_RETENTION_HOURS (default 48)
 */

const ROOT = "paper-stish/published-websites/";
const CONFIRM = process.argv.includes("--confirm");
const RETENTION_HOURS = Number(process.env.ORPHAN_RETENTION_HOURS || 48);

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const databaseUrl = process.env.DATABASE_URL;

if (!cloudName || !apiKey || !apiSecret) {
  console.error(
    "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
  );
  process.exit(1);
}
if (!databaseUrl) {
  console.error("Missing DATABASE_URL (read-only access is enough).");
  process.exit(1);
}

/* ── Cloudinary Admin API helper ─────────────────────────────────────────── */

const baseUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}`;
const authorization =
  "Basic " + Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString("base64");

async function cloudinary(path, { method = "GET", form } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      Authorization: authorization,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? form.toString() : undefined,
  });
  const raw = await response.text();
  let payload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { raw };
  }
  if (!response.ok) {
    throw new Error(
      `Cloudinary ${method} ${path} failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`,
    );
  }
  return payload;
}

async function getFolderMode() {
  const config = await cloudinary("/config?settings=true");
  const mode = config?.settings?.folder_mode;
  if (mode !== "dynamic" && mode !== "fixed") {
    throw new Error(
      "Could not identify Cloudinary folder mode. Refusing to delete assets without a confirmed targeting strategy.",
    );
  }
  return mode;
}

/** All image assets under the published-websites namespace (both folder modes). */
async function listPublishedMedia() {
  const found = [];
  let nextCursor;

  do {
    const form = new URLSearchParams({
      expression: `asset_folder=paper-stish/published-websites OR asset_folder:paper-stish/published-websites/*`,
      max_results: "500",
      with_field: "context",
    });
    if (nextCursor) form.set("next_cursor", nextCursor);
    const page = await cloudinary("/resources/search", { method: "POST", form });
    for (const resource of Array.isArray(page.resources) ? page.resources : []) {
      if (
        typeof resource.public_id === "string" &&
        resource.public_id.startsWith(ROOT)
      ) {
        found.push(resource);
      }
    }
    nextCursor = page.next_cursor || undefined;
  } while (nextCursor);

  return found;
}

/* ── Referenced public_ids from the database (read-only) ─────────────────── */

async function referencedPublicIds() {
  // Dynamic import keeps the script runnable without a build step when the
  // Prisma client has been generated (npm run db:generate).
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ log: ["error"] });
  const referenced = new Set();
  try {
    const publications = await prisma.publication.findMany({
      select: { data: true },
    });
    const cloudHost = `res.cloudinary.com/${cloudName}/image/upload/`;
    for (const row of publications) {
      // Extract every our-cloud URL from the snapshot JSON, then parse the
      // public_id (…/v<digits>/<public_id>.<ext>).
      for (const match of String(row.data || "").matchAll(/https:\/\/[^\s"'\\]+/g)) {
        const url = match[0];
        const at = url.indexOf(cloudHost);
        if (at < 0) continue;
        const tail = url.slice(at + cloudHost.length);
        const m = /^v\d+\/(.+)\.[a-zA-Z0-9]+$/.exec(tail);
        if (m) referenced.add(m[1]);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  return referenced;
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  const folderMode = await getFolderMode();
  const [resources, referenced] = await Promise.all([
    listPublishedMedia(),
    referencedPublicIds(),
  ]);

  const cutoff = Date.now() - RETENTION_HOURS * 60 * 60 * 1000;
  const orphans = resources.filter((resource) => {
    if (referenced.has(resource.public_id)) return false;
    const created = resource.created_at ? Date.parse(resource.created_at) : NaN;
    if (!Number.isFinite(created)) return false; // unknown age → never delete
    return created < cutoff;
  });

  console.log(`Cloudinary cloud: ${cloudName}`);
  console.log(`Folder mode: ${folderMode}`);
  console.log(`Namespace: ${ROOT}`);
  console.log(`Published-media assets: ${resources.length}`);
  console.log(`Referenced by publications: ${resources.length - orphans.length}`);
  console.log(`Orphaned (unreferenced, older than ${RETENTION_HOURS}h): ${orphans.length}`);
  for (const item of orphans.slice(0, 25)) {
    console.log(`  - ${item.public_id} (created ${item.created_at})`);
  }
  if (orphans.length > 25) {
    console.log(`  ... and ${orphans.length - 25} more`);
  }

  if (!CONFIRM) {
    console.log("\nDry run only. Add --confirm to permanently delete these orphaned assets.");
    return;
  }
  if (orphans.length === 0) {
    console.log("No orphaned assets found; nothing to delete.");
    return;
  }

  const ids = orphans.map((item) => (folderMode === "dynamic" ? item.asset_id : item.public_id)).filter(Boolean);
  if (ids.length !== orphans.length) {
    throw new Error("At least one orphan lacks an asset/public id. Nothing was deleted.");
  }

  let deletedCount = 0;
  const batchSize = 100;
  for (let i = 0; i < ids.length; i += batchSize) {
    const form = new URLSearchParams();
    if (folderMode === "dynamic") {
      for (const id of ids.slice(i, i + batchSize)) form.append("asset_ids[]", id);
      const result = await cloudinary("/resources", { method: "DELETE", form });
      deletedCount += Object.values(result.deleted || {}).filter((v) => v === "deleted").length;
    } else {
      for (const id of ids.slice(i, i + batchSize)) form.append("public_ids[]", id);
      const result = await cloudinary("/resources/image/upload", { method: "DELETE", form });
      deletedCount += Object.values(result.deleted || {}).filter((v) => v === "deleted").length;
    }
  }
  if (deletedCount !== orphans.length) {
    throw new Error(
      `Deleted ${deletedCount} of ${orphans.length} orphans. Review the Cloudinary Admin API result before rerunning.`,
    );
  }
  console.log(`Deleted ${deletedCount} orphaned published-media assets.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
