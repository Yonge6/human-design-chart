# BodyGraph Provenance Audit

## Scope

This audit covers only `assets/bodygraph-template.svg` and the visual and
rendering code that directly loads or changes that asset. It does not determine
the intellectual-property status of the Human Design system, the chart data
model, the calculation algorithm, or Swiss Ephemeris.

No SVG path, rendering behavior, chart result, or release binary was changed by
this audit.

## Runtime Usage

`app.js` creates the renderer with `createBodygraphRenderer` and passes
`./assets/bodygraph-template.svg` as `templateUrl`.
`src/renderer/bodygraph-renderer.js` fetches the template as text, injects it
into the BodyGraph container, and then changes:

- gate marker and label state from active gates;
- Personality and Design channel-track colors;
- defined and undefined center colors; and
- accessible SVG dimensions and labeling.

The renderer receives calculated Design, Personality, and Defined Centers data.
The calculation engine, API, profile snapshot, and schema do not depend on the
SVG file path or its path geometry. Existing tests enforce this separation.

The following are separate review subjects and must not be treated as one
copyright question:

- Human Design data and functional structure rules;
- the SVG's particular visual expression;
- the code that loads and colors the SVG; and
- the astronomy and chart-calculation algorithms.

## Repository Evidence

| Evidence | Result | Source |
| --- | --- | --- |
| Current SVG path | `assets/bodygraph-template.svg` | `app.js` `templateUrl`; repository tree |
| Current SVG SHA-256 | `92552e280efafd3167150c1230c588d430a49c00f361887093a4f8abc5ca870d` | `shasum -a 256 assets/bodygraph-template.svg` |
| First known commit | `9cf6b3385a179a001bef6c503051ae8dc3e6128f` | `git log --follow -- assets/bodygraph-template.svg` |
| Commit author | `YONG YUAN <yongyuan@YONGdeMac-mini.local>` | First known commit metadata |
| Commit date | `2026-07-11 14:31:05 +0800` | First known commit metadata |
| Commit message | `Implement local Swiss Ephemeris chart engine` | First known commit metadata |
| First known diff | New file from `/dev/null`, 466 content lines | `git show 9cf6b338 -- assets/bodygraph-template.svg` |
| Current-content history | Current Git blob `8d6e37284cafce2848c5a26a63c605f7cc5f3126` is the same blob introduced by `9cf6b338` and restored by `01b8bb80` | `git rev-parse <commit>:assets/bodygraph-template.svg`; `git log --find-object` |
| Current blame | Every current content line is attributed to `01b8bb8022221704b1f8042ebf5da57dab9236ff`, `Restore historical BodyGraph visual` | `git blame assets/bodygraph-template.svg` |
| Original source file found | No source design file for the current SVG was found | Current tree and `git rev-list --objects --all` |
| Third-party URL found | No exact source URL was found; repository history identifies a publicly loaded My Human Design result page by name | `THIRD_PARTY_NOTICES.md` at `9cf6b338`; `review/agpl-foundation.patch` |
| Third-party license found | No BodyGraph visual license or authorization file was found | Current tree, notices, documentation, and Git history |
| SVG metadata | No `title`, `desc`, `metadata`, comment, author, license, generator, Inkscape, Illustrator, Figma, or export marker | Current SVG header and metadata search |
| Geometry-generation record | No generation record was found for the current SVG. A generator existed for a different temporary replacement with SHA-256 `e22d41a5aa11f162e210088ac63078d42a60bbf00a61e9c2f9d4917eb4e5012a`; it was deleted when the current historical blob was restored | `scripts/generate-bodygraph-template.mjs` history from `5f6b1f8c` through `01b8bb80` |
| Independent-design evidence | No independent-design evidence was found for the current SVG. The temporary generated replacement is not the current audited object | Blob and SHA-256 comparison |
| Unresolved evidence | Exact source URL and terms, original designer, source file, capture/derivation method, permission scope, and owner creation records remain unresolved | Repository-wide audit |

The first known commit also added `THIRD_PARTY_NOTICES.md`. Its BodyGraph
section stated that the geometry was captured from a publicly loaded My Human
Design result-page SVG for fidelity research. Commit `01b8bb80` later restored
the same historical SVG content, deleted the independent replacement's
generator, and restored the corresponding source notice. Commit `ce2a1586`
replaced that specific source statement with a more general risk statement,
but `review/agpl-foundation.patch` preserves the earlier text.

These records are material provenance evidence. They do not by themselves
establish infringement, ownership, or the legal scope of any rights.

### Investigation Record

The audit included:

- `git log --follow -- assets/bodygraph-template.svg`;
- `git log --all --full-history -- assets/bodygraph-template.svg`;
- `git blame assets/bodygraph-template.svg`;
- first-commit and parent-tree inspection;
- first-commit and restore-commit diffs;
- current and historical blob and SHA-256 comparison;
- SVG header and metadata inspection;
- repository and full-history path searches for source designs, sketches,
  exports, coordinate generators, design notes, third-party references,
  authorship, licenses, and copied, derived, traced, or converted statements;
  and
- runtime inspection of `app.js`, `src/renderer/bodygraph-renderer.js`, engine,
  API, schema, and BodyGraph isolation tests.

Git commit authorship identifies who committed a file; it does not by itself
identify who designed the visual. Repository ownership or file presence does
not establish visual-rights clearance. Missing evidence is not evidence of
infringement. Similarity to the common functional BodyGraph structure also does
not by itself establish infringement.

## Functional Structure vs Visual Expression

The nine centers, 64 gates, channel relationships, and defined or undefined
states are functional structure used by the application. The particular center
shapes, coordinates, proportions, channel routing, body outline, typography,
color choices, and overall composition are the SVG's specific visual
expression.

This audit does not conclude the intellectual-property status of the Human
Design system itself. Swiss Ephemeris licensing is a separate release issue and
is not evidence for or against BodyGraph visual rights.

## Classification

### DERIVED_OR_UNCLEAR

The repository contains a specific historical statement that the current
visual lineage was captured from a publicly loaded My Human Design result-page
SVG. It does not contain an exact source URL, applicable license, permission
record, or independent creation evidence for the current blob. The independent
geometry generator found in history produced a different SVG and cannot be
used as authorship evidence for the current asset.

Existing evidence is insufficient to confirm that the template is independently
original, and it is also insufficient to directly conclude infringement. Before
release, the owner must supplement author and source-file evidence, obtain
applicable authorization, or independently redesign the visual.

This classification is an evidence status, not a legal opinion, copyright
registration, or Apple approval. It is not a finding of infringement.

## Owner Evidence Still Needed

The repository owner must provide or confirm, without Codex inventing or
completing the declaration:

- the earliest Figma, Illustrator, Sketch, SVG, or other source design file;
- dated drafts, sketches, or design-iteration screenshots;
- the creation date and designer's name;
- whether a specific third-party template was referenced;
- whether screenshot tracing, SVG capture, conversion, or path reuse occurred;
- any design-services contract or rights-assignment document;
- the exact third-party source URL and terms that applied at capture time;
- any license or authorization covering commercial use, modification,
  redistribution, and App Store distribution; and
- an account of how center coordinates, channel routing, gate positions, the
  body outline, typography, colors, and layout were formed.

## Release Decision

`DERIVED_OR_UNCLEAR` remains a release-rights blocker for the current SVG
because source and authorization evidence are unresolved. The blocker can be
closed by one of three evidence-backed paths:

1. provide reliable source, authorship, and independent-creation evidence that
   resolves the conflicting repository history;
2. obtain and retain authorization covering the intended commercial and App
   Store distribution; or
3. independently redesign the visual while retaining source files, design
   rationale, authorship, and export history.

This audit does not require deleting or replacing the current SVG now. Any
visual replacement requires separate authorization and must preserve identical
chart-calculation results.
