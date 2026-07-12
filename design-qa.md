final result: passed

**Source visual truth**

- User reference: `/tmp/codex-remote-attachments/019f2807-752a-73a1-81e6-c9cc64623217/AF0F1C8F-F4D3-4C0C-879C-9D36724CCBDD/1-照片-1.jpg`.
- Image2 mobile export background: `/Users/yongyuan/Documents/人类图/assets/pluto-chart-mobile-v1.png`.
- Reference/output comparison: `/Users/yongyuan/Documents/人类图/qa-mobile-export-comparison-v6.png`.
- Final reopened export: `/Users/yongyuan/Downloads/袁勇-human-design-chart.png` (`1200 x 2370`).

**Design comparison**

- The reference's phone-readable hierarchy is preserved: identity first, activation rails around the central BodyGraph, then properties.
- The production result is visually distinct and more premium: black obsidian, antique champagne gold, smoky ivory, engraved orbital geometry, and a restrained Pluto planetary limb.
- The BodyGraph is centered by its visible SVG content, not only its outer canvas, and sits on the exact `600px` poster centerline.
- Design and Personality rails have identical `98px` widths, `418px` heights, spacing, borders, and mirrored row direction.
- Every activation row uses fixed icon, name, and number columns; icons are subordinate, while Sun, Earth, Moon, and all other names remain readable in Chinese and English.
- The lower property section is a balanced two-column grid with fine gold rules and no nested cards.

**Mobile export requirements**

- Output width is `1200px`, appropriate for high-density phone screens and social sharing.
- Portrait ratio is approximately `9:17.8`; it may scroll vertically but reads comfortably at phone width.
- All real content is included: name, birth line, 13 Design activations, 13 Personality activations, BodyGraph, and 10 properties.
- The export contains no webpage controls, status bar, browser chrome, download button, or fake Image2 text.
- No vertical seam, stale mobile-width frame, clipping, horizontal overflow, or off-center graph appears in the reopened PNG.

**Functional verification**

- Real fixture: 袁勇, 1986-06-24 13:50, 湖南省湘潭市雨湖区.
- Chinese Photon location selection and Swiss Ephemeris generation completed successfully.
- Export downloaded from a `390 x 844` viewport and reopened successfully.
- Seven engine regression tests pass.
- `node --check` and `git diff --check` pass.

**Remaining polish**

- P3 only: the intentional breathing room below the BodyGraph creates an editorial pause before the technical properties and keeps the dense poster from feeling crowded.
