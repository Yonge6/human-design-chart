import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const DOCUMENT_PATHS = [
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/bodygraph-provenance-audit.md",
  "docs/bodygraph-original-redesign-plan.md",
  "docs/bodygraph-original-visual-provenance.md",
  "docs/app-store-review-readiness.md",
  "docs/app-store-release-checklist.md",
  "docs/app-store-metadata-draft.md",
  "docs/app-store-distribution-signing.md",
  "review/deployment-readiness.md",
  "store-assets/app-store-metadata.md",
];

const SWISS_DOCUMENT_PATHS = [
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/app-store-review-readiness.md",
  "docs/app-store-release-checklist.md",
  "docs/app-store-metadata-draft.md",
  "docs/app-store-distribution-signing.md",
  "review/deployment-readiness.md",
  "store-assets/app-store-metadata.md",
];

const PRODUCTION_COMMIT = "63b0beff7202885f6a1a42c64fc3e8aa7de6a8a1";
const HISTORICAL_SVG_SHA = "92552e280efafd3167150c1230c588d430a49c00f361887093a4f8abc5ca870d";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const normalize = (value) => value.replace(/\s+/g, " ");

async function readDocuments(paths = DOCUMENT_PATHS) {
  return new Map(await Promise.all(paths.map(async (path) => [path, await read(path)])));
}

test("Swiss Ephemeris release governance remains explicit and unresolved gates stay open", async () => {
  const documents = await readDocuments(SWISS_DOCUMENT_PATHS);

  for (const [path, source] of documents) {
    const text = normalize(source);
    assert.match(text, /Swiss Ephemeris AGPL licensing path is selected and documented/i, path);
    assert.match(text, /does not claim or rely on a Swiss Ephemeris Professional License/i, path);
    assert.match(text, /separately assess App Store distribution compatibility/i, path);
    assert.match(text, /No separate Astrodienst authorization/i, path);
    assert.match(text, /No [^.]*Apple [^.]*confirmation/i, path);
  }

  const allDocuments = normalize([...documents.values()].join("\n"));
  assert.doesNotMatch(allDocuments, /licensing (?:choice|path) (?:is |remains )?unresolved/i);
});

test("historical BodyGraph evidence and classification remain intact", async () => {
  const [audit, notices] = await Promise.all([
    read("docs/bodygraph-provenance-audit.md"),
    read("THIRD_PARTY_NOTICES.md"),
  ]);
  const normalizedAudit = normalize(audit);

  assert.match(normalizedAudit, /DERIVED_OR_UNCLEAR/);
  assert.match(normalizedAudit, new RegExp(HISTORICAL_SVG_SHA));
  assert.match(normalizedAudit, /My Human Design result-page/i);
  assert.match(normalizedAudit, /No source design file .* historical SVG was found/i);
  assert.match(normalizedAudit, /No BodyGraph visual license or authorization file was found/i);
  assert.match(normalizedAudit, /not a finding of infringement/i);
  assert.match(normalizedAudit, /evidence status, not a legal opinion/i);
  assert.doesNotMatch(normalizedAudit, /historical .* (?:is|was|has been) authorized/i);

  assert.match(notices, /^## Historical BodyGraph asset$/m);
  assert.match(notices, /^## Proposed project-generated BodyGraph visual$/m);
});

test("proposed visual status does not overstate merge, deployment, or release", async () => {
  const provenance = normalize(await read("docs/bodygraph-original-visual-provenance.md"));

  assert.match(provenance, /visual proposed by Draft PR #16/i);
  assert.doesNotMatch(provenance, /current release visual/i);
  assert.match(provenance, /has not been merged or deployed/i);
  assert.match(provenance, /production does not use it/i);
  assert.match(provenance, /merged at the exact reviewed head/i);
  assert.match(provenance, /final post-merge distribution archive/i);
  assert.match(provenance, /PASS_WITH_REQUIRED_CHANGES/);
  assert.match(provenance, /no reason to redo the new geometry/i);
  assert.match(provenance, /not legal advice/i);
  assert.match(provenance, /does not claim Apple approval/i);
});

test("release documents agree on the Draft PR and production boundary", async () => {
  const documents = await readDocuments();
  const staleClaims = [
    /Phase 6E has not started/i,
    /planned future Phase 6E/i,
    /current release visual/i,
    /current production visual/i,
    /BodyGraph replacement not implemented/i,
    /old SVG remains in the release/i,
  ];

  for (const [path, source] of documents) {
    const text = normalize(source);
    assert.match(text, /Draft PR #16/i, path);
    assert.match(text, /DERIVED_OR_UNCLEAR/, path);
    assert.match(text, /production remains version `?1\.1\.0`? at commit/i, path);
    assert.match(text, new RegExp(PRODUCTION_COMMIT), path);
    assert.match(text, /(?:not been merged or deployed|not merged or deployed|unmerged[^.]*undeployed)/i, path);
    assert.match(text, /final [^.]*archive/i, path);
    for (const staleClaim of staleClaims) assert.doesNotMatch(text, staleClaim, path);
    assert.doesNotMatch(text, /(?:new|proposed) (?:BodyGraph )?visual (?:is|has been) (?:live|deployed)/i, path);
    assert.doesNotMatch(text, /historical (?:asset|SVG) (?:is|remains) in (?:the )?(?:proposed|release-candidate) source/i, path);
  }
});

test("legal and Apple claims remain qualified", async () => {
  const documents = await readDocuments();
  const guardedPhrases = [
    "legally cleared",
    "legal clearance",
    "copyright safe",
    "copyright safety",
    "guaranteed original",
    "no copyright risk",
    "Apple approved",
    "Apple approval",
    "Apple compliant",
    "fully cleared for commercial use",
  ];

  for (const [path, source] of documents) {
    const text = normalize(source);
    for (const phrase of guardedPhrases) {
      let offset = 0;
      while (true) {
        const index = text.toLowerCase().indexOf(phrase.toLowerCase(), offset);
        if (index === -1) break;
        const sentenceStart = Math.max(0, text.lastIndexOf(".", index - 1) + 1);
        const sentenceEndCandidate = text.indexOf(".", index);
        const sentenceEnd = sentenceEndCandidate === -1 ? text.length : sentenceEndCandidate + 1;
        const context = text.slice(sentenceStart, sentenceEnd);
        assert.match(
          context,
          /\b(?:not|no|neither|does not|do not|must not|cannot|without)\b/i,
          `${path}: unqualified "${phrase}" in "${context}"`,
        );
        offset = index + phrase.length;
      }
    }
  }
});
