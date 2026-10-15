import test from "node:test";
import assert from "node:assert/strict";

import { qrCodeMatrix, qrCodeSvgPath } from "../src/lib/qrCode.ts";

test("creates a scannable-sized QR matrix for a published Paper Stish URL", () => {
  const matrix = qrCodeMatrix("https://paperstish.online/sandeep/our-story/AbC123_def");
  assert.ok(matrix);
  assert.ok(matrix.length >= 21 && matrix.length <= 57);
  assert.equal(matrix.length, matrix[0].length);
  assert.equal((matrix.length - 17) % 4, 0);
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[1][1], true);
  assert.equal(matrix[2][2], false);
  assert.ok(qrCodeSvgPath(matrix).startsWith("M"));
});

test("returns null instead of silently making a QR code that omits a long link", () => {
  assert.equal(qrCodeMatrix("https://paperstish.online/" + "x".repeat(400)), null);
});
