import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const auditPath = "docs/bodygraph-provenance-audit.md";
const audit = await read(auditPath);
const svg = await read("assets/bodygraph-template.svg");

const classificationDocuments = [
  auditPath,
  "docs/bodygraph-original-redesign-plan.md",
  "docs/app-store-review-readiness.md",
  "docs/app-store-release-checklist.md",
  "docs/app-store-distribution-signing.md",
];

const releaseDocuments = [
  ...classificationDocuments,
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "store-assets/app-store-metadata.md",
  "docs/app-store-metadata-draft.md",
  "docs/open-source-architecture.md",
  "docs/pages-deployment.md",
  "review/deployment-readiness.md",
];

test("BodyGraph provenance audit identifies the audited SVG and one classification", () => {
  assert.match(audit, /assets\/bodygraph-template\.svg/);
  const headings = [...audit.matchAll(/^### (VERIFIED_ORIGINAL|THIRD_PARTY_LICENSED|DERIVED_OR_UNCLEAR)$/gm)];
  assert.deepEqual(headings.map((match) => match[1]), ["DERIVED_OR_UNCLEAR"]);
});

test("BodyGraph audit records the unchanged current SVG SHA-256", () => {
  const actual = createHash("sha256").update(svg).digest("hex");
  assert.equal(actual, "92552e280efafd3167150c1230c588d430a49c00f361887093a4f8abc5ca870d");
  assert.match(audit, new RegExp(actual));
});

test("release documents do not repeat superseded mandatory-removal conclusions", async () => {
  const forbidden = [
    /current BodyGraph must be removed/i,
    /must replace the transitional visual template/i,
    /必须彻底移除/,
  ];
  for (const path of releaseDocuments) {
    const document = await read(path);
    for (const pattern of forbidden) {
      assert.doesNotMatch(document, pattern, `${path} must not contain ${pattern}`);
    }
  }
});

test("audit keeps authorship, repository ownership, missing evidence, and infringement distinct", () => {
  const normalized = audit.replace(/\s+/g, " ");
  assert.match(normalized, /Git commit authorship identifies who committed a file; it does not by itself identify who designed the visual\./);
  assert.match(normalized, /Repository ownership or file presence does not establish visual-rights clearance\./);
  assert.match(normalized, /Missing evidence is not evidence of infringement\./);
  assert.match(normalized, /not a finding of infringement/i);
});

test("BodyGraph release classification is consistent across primary release documents", async () => {
  for (const path of classificationDocuments) {
    assert.match(await read(path), /\bDERIVED_OR_UNCLEAR\b/, `${path} must record DERIVED_OR_UNCLEAR`);
  }
});
