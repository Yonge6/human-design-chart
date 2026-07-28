# Third-party notices

## Swiss Ephemeris browser WASM

- Source: https://github.com/swisseph-js/swisseph
- Package: `@swisseph/browser` 1.1.1
- License: AGPL-3.0; full text in `vendor/swisseph/LICENSE`
- Ephemeris data: `sepl_18.se1`, `semo_18.se1`, and `seas_18.se1` from https://github.com/aloistr/swisseph/tree/master/ephe
- SHA-256: `sepl_18.se1` `ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66`
- SHA-256: `semo_18.se1` `1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7`
- SHA-256: `seas_18.se1` `a2cd8fc33807c78ca9a700c91c2e042258b12fc4796519e00781440b5ad8b2e2`
- Local compatibility patch: the published browser bundle's unresolved enum defaults were replaced with their documented numeric constants.

The Swiss Ephemeris AGPL licensing path is selected and documented. The
project does not claim or rely on a Swiss Ephemeris Professional License.
Before App Store distribution, the release must verify fulfillment of the
applicable AGPL source-code, license, notice, and distribution obligations, and
separately assess App Store distribution compatibility under that path.
No separate Astrodienst authorization, legal opinion, Apple compatibility
confirmation, or complete closure of App Store distribution risk is represented.

## NatalEngine incarnation cross names

- Source: https://github.com/Unforced-Dev/natalengine
- License: MIT; full text in `vendor/natalengine/LICENSE`

## Photon place search

- Source: https://github.com/komoot/photon
- License: Apache-2.0
- Data: OpenStreetMap contributors, ODbL
- The public demo endpoint is used only for user-triggered place suggestions and may be replaced with a self-hosted Photon instance.

## tz-lookup

- Source: https://github.com/darkskyapp/tz-lookup
- Package: `tz-lookup` 6.1.25
- License: CC0-1.0; full text in `vendor/tz-lookup/LICENSE`

## html2canvas

- Source: https://github.com/niklasvh/html2canvas
- Package: `html2canvas` 1.4.1
- License: MIT; full text in `vendor/html2canvas/LICENSE`

## Historical BodyGraph asset

Repository history states that the historical visual lineage was captured from
a publicly loaded My Human Design result-page SVG for fidelity research. No
exact source URL, BodyGraph visual license, authorization file, or independent
creation evidence for that asset was found in the repository. Its historical
evidence classification remains `DERIVED_OR_UNCLEAR`; this is not a finding of
infringement. The asset is retained in the provenance record but is not part of
the source proposed by Draft PR #16. See
`docs/bodygraph-provenance-audit.md`.

## Proposed project-generated BodyGraph visual

Draft PR #16 proposes a new BodyGraph visual produced by the project's
deterministic generator from functional topology and independently defined
geometry rules. It is not listed as a third-party component. The PR is not
merged or deployed, and production remains version `1.1.0` at commit
`63b0beff7202885f6a1a42c64fc3e8aa7de6a8a1`. Entry into a release requires
merge of the exact reviewed head, a final distribution-archive exclusion check,
content-rights review, and separate release authorization. This notice is not
legal advice and does not claim Apple approval.
