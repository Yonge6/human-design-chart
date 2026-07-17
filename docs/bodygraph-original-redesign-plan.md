# BodyGraph original redesign plan

The current BodyGraph template is a transitional implementation and has a separate visual-origin risk. This repository does not claim that AGPL resolves visual copyright, that the current SVG is cleared for commercial use, or that third-party permission has been obtained.

The functional structure may remain: nine centers, 64 gates, channel relationships, dual Personality/Design tracks, and defined/undefined state. The final replacement should independently redesign:

- center geometry, corner language, proportions, and spacing
- channel routing, widths, junctions, and activation treatment
- gate nodes, numbers, typography, labels, and information hierarchy
- body silhouette, composition, palette, and accessibility contrast
- desktop, mobile, poster, and monochrome variants

Do not trace or copy third-party SVG paths. Keep dated sketches, source design files, geometry rationale, authorship records, and export history. Review similarity at component and whole-composition levels. Maintain fixture-based rendering tests so the original geometry replacement cannot change calculation results.

The template is injected into `src/renderer/bodygraph-renderer.js`; the core engine and API do not know its SVG paths. This isolation allows a future original design to replace the asset without modifying astronomy or Human Design calculations.
