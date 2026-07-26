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

const swissDocuments = [
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/app-store-review-readiness.md",
  "docs/app-store-release-checklist.md",
  "docs/app-store-metadata-draft.md",
  "docs/app-store-distribution-signing.md",
  "review/deployment-readiness.md",
  "store-assets/app-store-metadata.md",
];

const bodygraphPlanDocuments = [
  ...classificationDocuments,
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/app-store-metadata-draft.md",
  "review/deployment-readiness.md",
  "store-assets/app-store-metadata.md",
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

test("Swiss Ephemeris AGPL path is selected without claiming Professional License or App Store compatibility", async () => {
  for (const path of swissDocuments) {
    const document = (await read(path)).replace(/\s+/g, " ");
    assert.match(document, /Swiss Ephemeris AGPL licensing path is selected and documented\./);
    assert.match(document, /The project does not claim or rely on a Swiss Ephemeris Professional License\./);
    assert.match(document, /separately assess App Store distribution compatibility under that path/i);
    assert.doesNotMatch(document, /Swiss Ephemeris licensing decision/i);
    assert.doesNotMatch(document, /licensing choice unresolved/i);
    assert.doesNotMatch(document, /AGPL\s*\/\s*Professional License.*choice/i);
    assert.doesNotMatch(document, /AGPL (?:is|has been) (?:confirmed|approved) (?:as )?compatible with (?:the )?App Store/i);
    assert.doesNotMatch(document, /(?:obtained|holds) a Swiss Ephemeris Professional License/i);
  }
});

test("BodyGraph release plan consistently selects a future clean-room replacement", async () => {
  for (const path of bodygraphPlanDocuments) {
    const document = (await read(path)).replace(/\s+/g, " ");
    assert.match(document, /\bDERIVED_OR_UNCLEAR\b/);
    assert.match(
      document,
      /style-preserving, clean-room, independently generated (?:BodyGraph )?replacement/i,
    );
    assert.match(document, /Phase 6E has not started/i);
    assert.match(
      document,
      /(?:not planned for|must not enter|excluded from) the final App Store Release Candidate/i,
    );
  }
});

test("Phase 6E implementation is isolated from the provenance-audit task", async () => {
  const isolation = `${audit}\n${await read("docs/bodygraph-original-redesign-plan.md")}`.replace(/\s+/g, " ");
  assert.match(isolation, /Phase 6D-B audit task read the current SVG, the old Git blob, historical diffs, and portions of the existing geometry/i);
  assert.match(isolation, /current task must not perform the Phase 6E visual implementation/i);
  assert.match(isolation, /new Codex task/i);
  assert.match(isolation, /independent worktree/i);
  assert.match(isolation, /latest `main` only after PR #15 is merged/i);
  assert.match(isolation, /must not read the old SVG, old screenshots, old Git blob, or related historical diffs/i);
  assert.match(isolation, /read only brand CSS, page layout dimensions, functional topology, and a high-level style specification/i);
  assert.match(isolation, /not an absolute legal guarantee/i);
});

test("release plan does not claim authorization or legal advice already exists", async () => {
  const plan = (await read("docs/bodygraph-original-redesign-plan.md")).replace(/\s+/g, " ");
  assert.match(plan, /no usable evidence or authorization is currently available or claimed/i);
  assert.match(plan, /does not claim that authorization, legal advice, separate rights-holder approval, or Apple approval has been obtained/i);
  assert.doesNotMatch(plan, /authorization has been obtained/i);
  assert.doesNotMatch(plan, /legal opinion has been obtained/i);
});
