/* ───────────────────────────────────────────────────────────────────────────
   Paper Stish — published-media storage policy.

   Published websites must keep binary media OUT of PostgreSQL: when
   Cloudinary is configured for the deployment, every image published in a
   website (Smart Edit layers and normal-template photos) must already live
   at a durable URL — a Cloudinary delivery URL or a bundled public asset —
   before POST /api/publish accepts the snapshot. Embedded base64 photos are
   a legacy fallback used only when Cloudinary is not configured (local
   development), and they are bounded by the request-size limits.

   This module is intentionally dependency-free and client + server safe so
   the exact same rules can run on both sides, and so it can be unit-tested
   with the plain Node test runner (tests/published-media-policy.test.mts).
─────────────────────────────────────────────────────────────────────────── */

/** The env pair the Smart Edit editor already uses for unsigned uploads. */
export function cloudinaryMediaConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_UPLOAD_PRESET?.trim(),
  );
}

const DATA_IMAGE_RE = /^data:image\//i;

/** True for embedded base64 image payloads (the storage we must reject). */
export function isEmbeddedImage(value: unknown): value is string {
  return typeof value === "string" && DATA_IMAGE_RE.test(value);
}

export interface SmartEditDocumentLike {
  layers?: Array<{ type?: string; url?: string }>;
  fonts?: Array<{ source?: string; dataUrl?: string }>;
}

export interface TemplateValuesLike {
  photoUrl?: string | null;
  images?: string[];
}

/** Count embedded base64 IMAGES in a Smart Edit document.
 *  User fonts (font.dataUrl) are intentionally not images and stay allowed —
 *  embedding fonts in the snapshot is the established design so visitors
 *  never depend on the author's device. */
export function smartEditEmbeddedImageCount(document: SmartEditDocumentLike): number {
  let count = 0;
  for (const layer of document.layers ?? []) {
    if (layer.type !== "image" && layer.type !== "sticker") continue;
    if (isEmbeddedImage(layer.url)) count += 1;
  }
  return count;
}

/** Count embedded base64 photos in normal-template values. */
export function templateValuesEmbeddedImageCount(values: TemplateValuesLike): number {
  let count = 0;
  if (isEmbeddedImage(values.photoUrl)) count += 1;
  for (const image of values.images ?? []) {
    if (isEmbeddedImage(image)) count += 1;
  }
  return count;
}

/** Human-readable storage-policy error for the publish API. */
export function embeddedMediaError(count: number): string {
  return (
    `This website has ${count === 1 ? "a photo that is" : `${count} photos that are`} still stored on your device. ` +
    "Cloud storage must be available to publish it — check your connection and try again."
  );
}
