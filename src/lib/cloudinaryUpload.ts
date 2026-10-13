/* ───────────────────────────────────────────────────────────────────────────
   Paper Stish — publish-time Cloudinary uploads for normal templates.

   The normal website templates (Birthday, Love of My Life, Photo Album,
   Love Heart) keep photos on the user's device while editing (device-first
   model — see lib/localProjects.ts). When the user presses Publish, this
   module uploads the data-URL photos the snapshot needs to Cloudinary, so
   the server never has to persist base64 image bytes in PostgreSQL.

   Uses the same unsigned upload preset as Smart Edit
   (NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_*). When Cloudinary is not configured
   the helpers here are inert and publishing falls back to the bounded
   embedded-photo path for local development.
─────────────────────────────────────────────────────────────────────────── */

import type { TemplatePublicationValues } from "@/lib/publications";

export const PUBLISHED_TEMPLATE_PHOTOS_FOLDER = "paper-stish/published-websites/template-photos";

/** Matches the editor's input bound (assets.ts IMAGE_MAX_INPUT_BYTES). */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export interface CloudinaryClientConfig {
  cloudName: string;
  uploadPreset: string;
}

export function cloudinaryClientConfig(): CloudinaryClientConfig | null {
  const cloudName = process.env.NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_SMART_EDIT_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloudName || !uploadPreset) return null;
  return { cloudName, uploadPreset };
}

/** Decode a base64 image data URL into a Blob (browser + Node compatible). */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Could not read the photo for publishing.");
  const meta = dataUrl.slice(5, comma); // "image/webp;base64"
  const mime = meta.split(";")[0] || "image/webp";
  const base64 = dataUrl.slice(comma + 1);
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("That photo is too large (15 MB max). Use a smaller photo.");
  }
  return new Blob([bytes], { type: mime });
}

/** Upload one base64 image to Cloudinary under `folder`; returns the durable URL. */
export async function uploadDataUrlToCloudinary(
  dataUrl: string,
  config: CloudinaryClientConfig,
  folder: string,
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const form = new FormData();
  form.append("file", blob);
  form.append("upload_preset", config.uploadPreset);
  form.append("folder", folder);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`,
      { method: "POST", body: form },
    );
  } catch {
    throw new Error("Could not reach photo storage. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new Error("Photo storage rejected the upload. Try again in a moment.");
  }
  const data = (await response.json()) as { secure_url?: string; url?: string };
  const url = data.secure_url ?? data.url;
  if (!url) throw new Error("Photo storage did not return the uploaded photo. Try again.");
  return url;
}

/**
 * Replace embedded base64 photos in template values with durable Cloudinary
 * URLs (publish-time only — the device-local edit state is not touched).
 * Returns the values unchanged when Cloudinary is not configured.
 */
export async function durableTemplateValues(
  values: TemplatePublicationValues,
): Promise<TemplatePublicationValues> {
  const config = cloudinaryClientConfig();
  if (!config) return values;

  const next: TemplatePublicationValues = { ...values };

  if (typeof next.photoUrl === "string" && next.photoUrl.startsWith("data:")) {
    next.photoUrl = await uploadDataUrlToCloudinary(
      next.photoUrl,
      config,
      PUBLISHED_TEMPLATE_PHOTOS_FOLDER,
    );
  }

  if (Array.isArray(next.images)) {
    const images: string[] = [];
    for (const image of next.images) {
      images.push(
        typeof image === "string" && image.startsWith("data:")
          ? await uploadDataUrlToCloudinary(image, config, PUBLISHED_TEMPLATE_PHOTOS_FOLDER)
          : image,
      );
    }
    next.images = images;
  }

  return next;
}
