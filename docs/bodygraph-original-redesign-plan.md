# BodyGraph provenance and originality plan

The current template's rendering code is part of this project, but whether the
SVG itself is independently original depends on how its visual geometry was
formed. The repository must use the evidence in
[bodygraph-provenance-audit.md](bodygraph-provenance-audit.md) before making a
release-rights claim.

The current classification is `DERIVED_OR_UNCLEAR`. Repository history records
a third-party visual reference, while the exact source, applicable permission,
and independent-creation evidence for the current SVG remain incomplete. This
classification does not itself establish infringement.

Supplemental owner evidence or applicable authorization could theoretically
change the release decision, but no usable evidence or authorization is
currently available or claimed. The planned App Store release path is a
style-preserving, clean-room, independently generated replacement. The current
SVG is not planned for the final App Store Release Candidate.

The following subjects remain distinct:

- Human Design data and functional relationships;
- the SVG's center geometry, coordinates, channel routing, body outline,
  typography, colors, and composition;
- the renderer that injects and colors the SVG; and
- the astronomy and chart-calculation algorithms.

If the audit result remains `DERIVED_OR_UNCLEAR`, a replacement should
independently redesign:

- center geometry, corner language, proportions, and spacing;
- channel routing, widths, junctions, and activation treatment;
- gate nodes, numbers, typography, labels, and information hierarchy;
- body silhouette, composition, palette, and accessibility contrast; and
- desktop, mobile, poster, and monochrome variants.

Do not trace or copy third-party SVG paths. Keep dated sketches, source design
files, geometry rationale, authorship records, and export history. Review
similarity at component and whole-composition levels.

## Clean-room Task Isolation

The Phase 6D-B audit task read the current SVG, the old Git blob, historical
diffs, and portions of the existing geometry. The current task must not perform
the Phase 6E visual implementation.

Phase 6E has not started. It must use a new Codex task and an independent
worktree, beginning from the latest `main` only after PR #15 is merged. The new
task must not read the old SVG, old screenshots, old Git blob, or related
historical diffs. It may read only brand CSS, page layout dimensions, functional
topology, and a high-level style specification.

High-level brand style may continue, but the specific visual expression must be
formed independently. This process isolation is provenance evidence, not an
absolute legal guarantee. The project does not claim that authorization, legal
advice, separate rights-holder approval, or Apple approval has been obtained.

The template is injected by `src/renderer/bodygraph-renderer.js`; the core
engine and API do not know its SVG paths. Any authorized visual replacement
must retain fixture-based rendering tests and must not change astronomy, Human
Design calculations, or chart results.
