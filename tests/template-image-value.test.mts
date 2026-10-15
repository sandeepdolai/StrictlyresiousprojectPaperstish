import test from "node:test";
import assert from "node:assert/strict";

import { isBundledPublicImagePath } from "../src/lib/templateImageValue.ts";

test("accepts app-bundled public image paths used by template starter art", () => {
  assert.equal(isBundledPublicImagePath("/templates/love-bow.webp"), true);
  assert.equal(isBundledPublicImagePath("/my-base/templates/photo-1.png"), true);
  assert.equal(isBundledPublicImagePath("/website-templates/preview.svg"), true);
});

test("does not treat external, protocol-relative, or traversal paths as bundled images", () => {
  assert.equal(isBundledPublicImagePath("https://example.com/photo.webp"), false);
  assert.equal(isBundledPublicImagePath("//example.com/photo.webp"), false);
  assert.equal(isBundledPublicImagePath("/../secret.webp"), false);
  assert.equal(isBundledPublicImagePath("/templates/photo.webp?remote=1"), false);
  assert.equal(isBundledPublicImagePath("data:image/webp;base64,AAAA"), false);
  assert.equal(isBundledPublicImagePath(null), false);
});
