#!/usr/bin/env node

/**
 * Safely remove only Paper Stish test template media from Cloudinary.
 *
 * This script targets the namespace used by Publish Template:
 *   paper-stish/templates/<projectId>/
 *
 * It never deletes paper-stish/user-assets or other folders. Without
 * --confirm it is a dry run and prints the assets that would be deleted.
 *
 * Required environment variables:
 *   CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_CLOUD_NAME)
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

const PREFIX = "paper-stish/templates/";
const CONFIRM = process.argv.includes("--confirm");

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error(
    "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
  );
  process.exit(1);
}

const baseUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}`;
const authorization =
  "Basic " + Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString("base64");

async function request(path, { method = "GET", form } = {}) {
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
      `Cloudinary ${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  }
  return payload;
}

async function getFolderMode() {
  const config = await request("/config?settings=true");
  const mode = config?.settings?.folder_mode;
  if (mode !== "dynamic" && mode !== "fixed") {
    throw new Error(
      "Could not identify Cloudinary folder mode. Refusing to delete assets without a confirmed targeting strategy.",
    );
  }
  return mode;
}

async function listDynamicFolderAssets() {
  const found = [];
  let nextCursor;

  do {
    const form = new URLSearchParams({
      expression: "asset_folder=paper-stish/templates OR asset_folder:paper-stish/templates/*",
      max_results: "500",
    });
    if (nextCursor) form.set("next_cursor", nextCursor);

    const page = await request("/resources/search", { method: "POST", form });
    const resources = Array.isArray(page.resources) ? page.resources : [];

    // The server-side expression is folder-scoped; this extra check narrows
    // the result set further if Cloudinary returns asset_folder metadata.
    for (const resource of resources) {
      if (
        typeof resource.asset_folder !== "string" ||
        resource.asset_folder === "paper-stish/templates" ||
        resource.asset_folder.startsWith(PREFIX)
      ) {
        found.push(resource);
      }
    }

    nextCursor = page.next_cursor || undefined;
  } while (nextCursor);

  return found;
}

async function listFixedFolderAssets() {
  const found = [];
  let nextCursor;

  do {
    const params = new URLSearchParams({
      prefix: PREFIX,
      max_results: "500",
    });
    if (nextCursor) params.set("next_cursor", nextCursor);

    const page = await request(
      `/resources/image/upload?${params.toString()}`,
    );

    for (const resource of Array.isArray(page.resources) ? page.resources : []) {
      if (typeof resource.public_id === "string" && resource.public_id.startsWith(PREFIX)) {
        found.push(resource);
      }
    }

    nextCursor = page.next_cursor || undefined;
  } while (nextCursor);

  return found;
}

async function deleteDynamicAssets(resources) {
  const ids = resources.map((item) => item.asset_id).filter(Boolean);
  if (ids.length !== resources.length) {
    throw new Error(
      "At least one Cloudinary asset did not include an asset ID. Nothing was deleted.",
    );
  }

  let deletedCount = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const form = new URLSearchParams();
    for (const id of ids.slice(i, i + 100)) form.append("asset_ids[]", id);
    const result = await request("/resources", { method: "DELETE", form });
    const outcomes = Object.values(result.deleted || {});
    deletedCount += outcomes.filter((value) => value === "deleted").length;
    const failures = outcomes.filter((value) => value !== "deleted");
    if (failures.length) {
      throw new Error(
        `Cloudinary reported ${failures.length} deletion failures in batch starting at asset ${i + 1}.`,
      );
    }
  }
  return deletedCount;
}

async function deleteFixedAssets(resources) {
  const ids = resources.map((item) => item.public_id).filter(Boolean);
  if (ids.length !== resources.length) {
    throw new Error(
      "At least one Cloudinary resource did not include a public ID. Nothing was deleted.",
    );
  }

  let deletedCount = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const form = new URLSearchParams();
    for (const id of ids.slice(i, i + 100)) form.append("public_ids[]", id);
    const result = await request("/resources/image/upload", { method: "DELETE", form });
    const outcomes = Object.values(result.deleted || {});
    deletedCount += outcomes.filter((value) => value === "deleted").length;
    const failures = outcomes.filter((value) => value !== "deleted");
    if (failures.length) {
      throw new Error(
        `Cloudinary reported ${failures.length} deletion failures in batch starting at asset ${i + 1}.`,
      );
    }
  }
  return deletedCount;
}

async function main() {
  const folderMode = await getFolderMode();
  const resources =
    folderMode === "dynamic"
      ? await listDynamicFolderAssets()
      : await listFixedFolderAssets();

  console.log(`Cloudinary cloud: ${cloudName}`);
  console.log(`Folder mode: ${folderMode}`);
  console.log(`Target namespace: ${PREFIX}`);
  console.log(`Matching test-template image assets: ${resources.length}`);
  for (const item of resources.slice(0, 25)) {
    console.log(
      `  - ${item.public_id || item.display_name || item.asset_id}` +
        (item.asset_folder ? ` [${item.asset_folder}]` : ""),
    );
  }
  if (resources.length > 25) {
    console.log(`  ... and ${resources.length - 25} more`);
  }

  if (!CONFIRM) {
    console.log("\nDry run only. Add --confirm to permanently delete these matching assets.");
    return;
  }

  if (resources.length === 0) {
    console.log("No matching assets found; nothing to delete.");
    return;
  }

  const deleted =
    folderMode === "dynamic"
      ? await deleteDynamicAssets(resources)
      : await deleteFixedAssets(resources);

  if (deleted !== resources.length) {
    throw new Error(
      `Deleted ${deleted} of ${resources.length} matching assets. Review the Cloudinary Admin API result before rerunning.`,
    );
  }

  console.log(`Deleted ${deleted} test-template assets from ${PREFIX}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
