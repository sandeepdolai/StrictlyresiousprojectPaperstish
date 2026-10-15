/**
 * Paths to images shipped inside the app's public/ directory.
 *
 * Normal website templates may include these alongside uploaded HTTPS or
 * data-URL photos (for example, Photo Album starter artwork). They are safe
 * publication references and must survive snapshot validation unchanged.
 */
const BUNDLED_PUBLIC_IMAGE_PATH =
  /^\/(?:[A-Za-z0-9_-][A-Za-z0-9._~-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._~-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

export function isBundledPublicImagePath(value: unknown): value is string {
  return typeof value === "string" &&
    !value.startsWith("//") &&
    BUNDLED_PUBLIC_IMAGE_PATH.test(value);
}
