/**
 * Paper Stish — server-authorized upload flow tests.
 *
 * Covers the pure logic behind POST /api/uploads/authorize and the
 * publish-time reference policy: Cloudinary signatures, user/site-scoped
 * destinations, quota windows, and media-reference authorization.
 *
 * Run with the plain Node test runner (type stripping needs Node >= 23.6):
 *   node --test tests/
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  ADMIN_ONLY_PURPOSE,
  buildGrant,
  cloudinarySignature,
  composedPublicId,
  newUploadSuffix,
  quotaDecision,
  signaturesMatch,
  uploadFolderForPurpose,
  userMediaRoot,
  UPLOADS_PER_DAY,
  UPLOADS_PER_HOUR,
} from "../src/lib/uploadAuthorization.ts";
import {
  cloudinaryPublicIdFromUrl,
  isAuthorizedMediaReference,
  smartEditUnauthorizedReferences,
  templateValuesUnauthorizedReferences,
  unauthorizedMediaError,
} from "../src/lib/publishedMediaPolicy.ts";

const USER_A = "clxuseraaaaaaaaaaaaa";
const USER_B = "clxuserbbbbbbbbbbbbb";
const CLOUD = "demo-cloud";

function url(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/v1728000000/${publicId}.jpg`;
}

/* ── Cloudinary signature ─────────────────────────────────────────────── */

test("cloudinarySignature matches the documented sha1(sorted k=v&… + secret) algorithm", () => {
  // Independent golden vector (computed with node crypto, not the module).
  const expected = createHash("sha1")
    .update("folder=paper-stish/x&public_id=paper-stish/x/abc&timestamp=1728000000&upload_preset=preset1" + "shhh")
    .digest("hex");
  assert.equal(
    cloudinarySignature(
      {
        upload_preset: "preset1",
        public_id: "paper-stish/x/abc",
        timestamp: 1728000000,
        folder: "paper-stish/x",
      },
      "shhh",
    ),
    expected,
  );
});

test("cloudinarySignature is parameter-order independent (sorted internally)", () => {
  const a = cloudinarySignature({ b: "2", a: "1" }, "s");
  const b = cloudinarySignature({ a: "1", b: "2" }, "s");
  assert.equal(a, b);
});

test("signaturesMatch is constant-time safe and exact", () => {
  const sig = cloudinarySignature({ timestamp: 1 }, "s");
  assert.equal(signaturesMatch(sig, sig), true);
  assert.equal(signaturesMatch(sig, sig.slice(0, -1) + "0"), false);
  assert.equal(signaturesMatch(sig, "short"), false);
});

/* ── Destinations ─────────────────────────────────────────────────────── */

test("uploadFolderForPurpose scopes user media under the uploader's namespace", () => {
  assert.equal(
    uploadFolderForPurpose(USER_A, "template-photos"),
    `paper-stish/published-websites/u/${USER_A}/template-photos`,
  );
  assert.equal(
    uploadFolderForPurpose(USER_A, "smart-edit", "My Project!!"),
    `paper-stish/published-websites/u/${USER_A}/sites/MyProject`,
  );
});

test("uploadFolderForPurpose keeps admin assets in the templates namespace", () => {
  assert.equal(
    uploadFolderForPurpose(USER_A, ADMIN_ONLY_PURPOSE, "proj-1"),
    "paper-stish/templates/proj-1",
  );
});

test("user namespaces of different users never overlap", () => {
  const a = uploadFolderForPurpose(USER_A, "template-photos");
  const b = uploadFolderForPurpose(USER_B, "template-photos");
  assert.notEqual(a, b);
  assert.ok(!a.startsWith(b) && !b.startsWith(a));
  assert.equal(userMediaRoot(USER_A), `paper-stish/published-websites/u/${USER_A}`);
});

test("newUploadSuffix is unpredictable; composed ids nest in the folder", () => {
  const folder = uploadFolderForPurpose(USER_A, "smart-edit", "site");
  const ids = new Set(Array.from({ length: 200 }, () => newUploadSuffix()));
  assert.equal(ids.size, 200); // no collisions
  for (const suffix of ids) {
    const id = composedPublicId(folder, suffix);
    assert.ok(id.startsWith(folder + "/"));
    assert.ok(!id.includes(".."));
    assert.ok(!suffix.includes("/")); // param form is the bare suffix
  }
});

/* ── Quotas ───────────────────────────────────────────────────────────── */

test("quotaDecision allows requests within both windows", () => {
  assert.deepEqual(quotaDecision({ lastHour: 0, lastDay: 0 }, 24), { allowed: true });
  assert.deepEqual(
    quotaDecision({ lastHour: UPLOADS_PER_HOUR - 7, lastDay: 0 }, 7),
    { allowed: true },
  );
});

test("quotaDecision blocks hour and day overruns with retry hints", () => {
  const hour = quotaDecision({ lastHour: UPLOADS_PER_HOUR, lastDay: 0 }, 1);
  assert.equal(hour.allowed, false);
  assert.equal(hour.retryAfterSeconds, 60 * 60);

  const day = quotaDecision({ lastHour: 0, lastDay: UPLOADS_PER_DAY }, 1);
  assert.equal(day.allowed, false);
  assert.equal(day.retryAfterSeconds, 6 * 60 * 60);
});

test("quotaDecision counts the whole request against both windows", () => {
  assert.equal(quotaDecision({ lastHour: UPLOADS_PER_HOUR - 2, lastDay: 0 }, 3).allowed, false);
  assert.equal(quotaDecision({ lastHour: 0, lastDay: UPLOADS_PER_DAY - 2 }, 3).allowed, false);
});

/* ── Grants ───────────────────────────────────────────────────────────── */

test("buildGrant signs folder + suffix public_id + preset + timestamp for the user's folder", () => {
  const config = {
    cloudName: CLOUD,
    apiKey: "key123",
    apiSecret: "shhh",
    uploadPreset: "signed-preset",
  };
  const grant = buildGrant(config, USER_A, "smart-edit", "site-1", 1728000000000);
  assert.equal(grant.folder, `paper-stish/published-websites/u/${USER_A}/sites/site-1`);
  assert.ok(grant.uploadPublicId && !grant.uploadPublicId.includes("/"));
  assert.equal(grant.publicId, composedPublicId(grant.folder, grant.uploadPublicId));
  assert.equal(grant.timestamp, 1728000000);
  assert.equal(
    grant.signature,
    cloudinarySignature(
      {
        folder: grant.folder,
        public_id: grant.uploadPublicId,
        timestamp: grant.timestamp,
        upload_preset: grant.uploadPreset,
      },
      "shhh",
    ),
  );
  assert.ok(grant.apiKey === "key123" && !("apiSecret" in grant));
});

/* ── Reference policy ─────────────────────────────────────────────────── */

test("cloudinaryPublicIdFromUrl parses only canonical our-cloud delivery URLs", () => {
  assert.equal(cloudinaryPublicIdFromUrl(url("paper-stish/published-websites/u/a/b/c"), CLOUD), "paper-stish/published-websites/u/a/b/c");
  // Foreign cloud → null (treated as a plain https reference, not our storage)
  assert.equal(
    cloudinaryPublicIdFromUrl(`https://res.cloudinary.com/other/image/upload/v1/a.jpg`, CLOUD),
    null,
  );
  // Non-image / non-upload / transformed paths → null
  assert.equal(cloudinaryPublicIdFromUrl(`https://res.cloudinary.com/${CLOUD}/video/upload/v1/a.mp4`, CLOUD), null);
  assert.equal(cloudinaryPublicIdFromUrl(`https://res.cloudinary.com/${CLOUD}/image/upload/f_auto/v1/a.jpg`, CLOUD), null);
  assert.equal(cloudinaryPublicIdFromUrl(`https://example.com/a.jpg`, CLOUD), null);
  assert.equal(cloudinaryPublicIdFromUrl(`/smart-edit/library/x.png`, CLOUD), null);
});

test("isAuthorizedMediaReference accepts own namespace and shared legacy namespaces", () => {
  assert.equal(isAuthorizedMediaReference(`paper-stish/published-websites/u/${USER_A}/sites/s/x`, USER_A), true);
  assert.equal(isAuthorizedMediaReference(`paper-stish/published-websites/u/${USER_A}/template-photos/x`, USER_A), true);
  // Legacy (pre-authorization) paths stay readable for existing publications.
  assert.equal(isAuthorizedMediaReference("paper-stish/published-websites/template-photos/x", USER_A), true);
  assert.equal(isAuthorizedMediaReference("paper-stish/published-websites/old-project/x", USER_A), true);
  assert.equal(isAuthorizedMediaReference("paper-stish/user-assets/x", USER_A), true);
  assert.equal(isAuthorizedMediaReference("paper-stish/templates/t/x", USER_A), true);
});

test("isAuthorizedMediaReference rejects foreign user namespaces and unknown namespaces", () => {
  assert.equal(isAuthorizedMediaReference(`paper-stish/published-websites/u/${USER_B}/x`, USER_A), false);
  // Same prefix trick: u/<userA>extra is not user A's namespace
  assert.equal(isAuthorizedMediaReference(`paper-stish/published-websites/u/${USER_A}extra/x`, USER_A), false);
  assert.equal(isAuthorizedMediaReference("paper-stish/evil/x", USER_A), false);
  assert.equal(isAuthorizedMediaReference("other-root/x", USER_A), false);
});

test("smartEditUnauthorizedReferences flags only foreign our-cloud layers", () => {
  const offenders = smartEditUnauthorizedReferences(
    {
      layers: [
        { type: "image", url: url(`paper-stish/published-websites/u/${USER_A}/sites/s/1`) },
        { type: "image", url: url(`paper-stish/published-websites/u/${USER_B}/sites/s/2`) },
        { type: "sticker", url: "/smart-edit/library/stickers/heart.png" },
        { type: "sticker", url: url("paper-stish/templates/t/3") },
        { type: "image", url: "https://example.com/photo.jpg" },
        { type: "text", url: url(`paper-stish/published-websites/u/${USER_B}/x`) },
      ],
    },
    CLOUD,
    USER_A,
  );
  assert.deepEqual(offenders, [`paper-stish/published-websites/u/${USER_B}/sites/s/2`]);
});

test("templateValuesUnauthorizedReferences flags foreign references in photoUrl/images", () => {
  const offenders = templateValuesUnauthorizedReferences(
    {
      photoUrl: url(`paper-stish/published-websites/u/${USER_B}/x`),
      images: [
        url(`paper-stish/published-websites/u/${USER_A}/template-photos/ok`),
        "https://example.com/ok.jpg",
        url("paper-stish/user-assets/legacy"),
      ],
    },
    CLOUD,
    USER_A,
  );
  assert.deepEqual(offenders, [`paper-stish/published-websites/u/${USER_B}/x`]);
});

test("unauthorizedMediaError renders singular and plural messages", () => {
  assert.match(unauthorizedMediaError(1), /a photo/);
  assert.match(unauthorizedMediaError(2), /2 photos/);
});
