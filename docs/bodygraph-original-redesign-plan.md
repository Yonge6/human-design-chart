# BodyGraph provenance and originality plan

The historical template's rendering code was part of this project, but whether
that SVG was independently original depends on how its visual geometry was
formed. The repository must retain the evidence in
[bodygraph-provenance-audit.md](bodygraph-provenance-audit.md) before making a
release-rights claim.

The historical classification is `DERIVED_OR_UNCLEAR`. Repository history records
a third-party visual reference, while the exact source, applicable permission,
and independent-creation evidence for the historical SVG remain incomplete. This
classification does not itself establish infringement.

Supplemental owner evidence or applicable authorization could theoretically
change the release decision, but no usable evidence or authorization is
currently available or claimed for that asset. Draft PR #16 now proposes a
style-preserving, clean-room, project-generated release-candidate visual. The
historical SVG is not part of that proposed source or its verified A3 build
outputs.

The following subjects remain distinct:

- Human Design data and functional relationships;
- the SVG's center geometry, coordinates, channel routing, body outline,
  typography, colors, and composition;
- the renderer that injects and colors the SVG; and
- the astronomy and chart-calculation algorithms.

The clean-room implementation independently redesigned:

- center geometry, corner language, proportions, and spacing;
- channel routing, widths, junctions, and activation treatment;
- gate nodes, numbers, typography, labels, and information hierarchy;
- body silhouette, composition, palette, and accessibility contrast; and
- desktop, mobile, poster, and monochrome variants.

Do not trace or copy third-party SVG paths. Keep dated sketches, source design
files, geometry rationale, authorship records, and export history. Review
similarity at component and whole-composition levels.

## Clean-room Task Isolation

The Phase 6D-B audit task read the historical SVG, the old Git blob, historical
diffs, and portions of the existing geometry. The current task must not perform
the Phase 6E visual implementation.

Phase 6E A1, A2, and A3 used new Codex tasks and independent worktrees beginning
from the reviewed `main`. Their clean-room implementation context did not read
the old SVG, old screenshots, old Git blob, related historical diffs, or
third-party BodyGraph visuals. The implementation used brand CSS, page layout
dimensions, functional topology, rendering-state semantics, and the committed
high-level design specification.

High-level brand style may continue, but the specific visual expression must be
formed independently. This process isolation is provenance evidence, not an
absolute legal guarantee. The project does not claim that authorization, legal
advice, separate rights-holder approval, or Apple approval has been obtained.

The template is injected by `src/renderer/bodygraph-renderer.js`; the core
engine and API do not know its SVG paths. Any authorized visual replacement
must retain fixture-based rendering tests and must not change astronomy, Human
Design calculations, or chart results.

## Resolution status

Draft PR #16 contains the proposed deterministic visual, original geometry
rules, generator, provenance record, and integration. The historical SVG is
excluded from the PR's proposed runtime source, web distribution, iOS public
bundle, and A3 development archive. Independent engineering review returned
`PASS_WITH_REQUIRED_CHANGES`, found no mechanical reuse of historical paths,
coordinates, human silhouette, or routing, and found no reason to redo the new
geometry. B2 addresses only release-state wording, governance tests,
authoritative topology comparison, and release-asset automation.

The historical `DERIVED_OR_UNCLEAR` classification remains attached to the
historical SVG and is not deleted or automatically transferred to the proposed
visual. PR #16 remains Draft, unmerged, and undeployed. Production remains
version `1.1.0` at commit
`63b0beff7202885f6a1a42c64fc3e8aa7de6a8a1`. Merge of the exact reviewed head,
final post-merge distribution-archive confirmation that the historical asset is
excluded, final content-rights review, and separate release authorization are
still required. No legal clearance, absolute copyright safety, rights-holder
authorization, or Apple approval is claimed.
