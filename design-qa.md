final result: passed

**Evidence**

- Source visual truth: `/Users/yongyuan/Documents/人类图/style-draft-3-archive-ritual.png`
- User-reported broken export: `/tmp/codex-remote-attachments/019f2807-752a-73a1-81e6-c9cc64623217/4A9CDBC2-8A13-4405-BE66-5548C5CE2FFF/1-照片-1.jpg`
- Desktop generated state: `/Users/yongyuan/Documents/人类图/qa-bilingual-generated-zh.png`
- Mobile generated state: `/Users/yongyuan/Documents/人类图/qa-bilingual-mobile-generated.png`
- Export comparison: `/Users/yongyuan/Documents/人类图/qa-comparison-export.png`
- Verified PNG: `/Users/yongyuan/Downloads/Test-human-design-chart.png` (`2256 x 2450`, 3.1 MB)
- Viewports: desktop `1440 x 1000`; mobile `390 x 844`.
- State: generated chart for Test, 1990-01-01 12:00 PM, Shanghai; Chinese and English presentations.

**Findings**

- No P0/P1/P2 issues remain in the scoped generation, bilingual, responsive, or PNG-export experience.
- The previous full-chart screenshot used as a pseudo-element texture was removed. The exported PNG now contains one chart only, with no ghost layers, duplicate labels, or large accidental canvas extension.
- Export uses a deterministic 1128px desktop clone regardless of the live mobile/desktop viewport. The button is hidden, fonts are awaited, and form/language mutations are locked until capture completes.
- Chinese and English switch without recalculating planetary data. Static copy, status messages, birth date, planet names, properties, title, placeholders, and ARIA labels update together.
- The implementation keeps the option-3 black-plum and parchment composition. The exact production BodyGraph is intentionally cleaner and less distressed than the concept image so gate labels remain readable.

**Required Fidelity Surfaces**

- Fonts and typography: English serif and Chinese Song-style fallbacks preserve the archival tone; compact UI copy remains legible at 390px.
- Spacing and layout: two-panel desktop composition and stacked mobile flow have no page-level horizontal overflow; the language control remains visible on mobile.
- Colors and tokens: black-plum, bone, wine red, bronze, and muted violet match the selected Pluto archive direction.
- Image quality and assets: the real dynamic BodyGraph SVG and planetary icon font are used; no screenshot is embedded behind the chart.
- Copy and content: both locales were checked in generated and empty states, including dynamic Human Design properties.

**Functional Verification**

- Seven engine regression tests pass, including fractional time zones, DST gaps/folds, gate mapping, channels, and authority.
- Chinese and English generation both complete locally with Swiss Ephemeris.
- Language switching preserves all gate/line values and translates the current result without recalculation.
- A real English PNG download was reopened and inspected; PNG dimensions, content, and visual alignment are valid.
- Mobile generation has `390px` document width, no page horizontal overflow, and a visible language switch.
- Browser console: no warnings or errors.

**Comparison History**

- Pass 1 found the complete chart screenshot duplicated under the live chart, causing the reported ghosting. Removed it from `.chart-panel::after`.
- Pass 2 found responsive rules could affect export. Added `.export-mode` with a fixed desktop chart grid and verified the same export structure from mobile.
- Pass 3 found language and form mutation races during async capture. Locked controls, snapshotted export data, hid the download control, and extended the object URL lifetime.

**Follow-up Polish**

- A fresh Image2 visual exploration could not be generated in this run because both available Image2 paths timed out. The existing selected option-3 Image2 concept remains the visual source of truth.
