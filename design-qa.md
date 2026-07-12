final result: passed

**Evidence**

- Source visual truth: `/Users/yongyuan/Documents/人类图/style-draft-3-archive-ritual.png`
- New Image2 asset: `/Users/yongyuan/Documents/人类图/assets/pluto-vellum-bg-v2.png`
- Generated desktop state: `/Users/yongyuan/Documents/人类图/qa-image2-v2-generated.png`
- Side-by-side export comparison: `/Users/yongyuan/Documents/人类图/qa-comparison-image2-v2.png`
- Desktop PNG: `/Users/yongyuan/Downloads/Pluto-human-design-chart.png`
- Mobile PNG: `/Users/yongyuan/Downloads/Mobile-human-design-chart.png`
- Desktop viewport: `1280px`; mobile viewport: `390 x 844`.
- State: 1990-01-01 12:00 PM, selected Chinese address `湖南省湘潭市雨湖区`.

**Findings**

- No P0/P1/P2 issues remain in the scoped empty-form, Chinese-address, chart-generation, responsive, or PNG-export experience.
- Image2 produced a content-free vellum texture with Pluto orbit engraving and an antique bronze border. It contains no text, UI, or duplicate BodyGraph, so it cannot recreate the original ghost-layer failure.
- Default name, date, time, AM/PM, and location controls are all empty. Required native selection prevents incomplete submissions.
- Continuous Chinese input `湖南省湘潭市雨湖区` is segmented internally for Photon, returns a selectable result, preserves the user's Chinese label, and resolves the correct coordinates/timezone.
- Desktop and mobile both export the same deterministic `2256 x 2302` poster composition. The button and watermark are absent from the PNG; the BodyGraph, both activation columns, and all ten properties remain visible.

**Required Fidelity Surfaces**

- Fonts and typography: Chinese Song-style display text and compact sans-serif metadata preserve the archival editorial hierarchy.
- Spacing and layout: the generated chart is vertically tighter than the previous export, with the properties band pulled closer to the BodyGraph and no accidental empty canvas extension.
- Colors and tokens: bone vellum, graphite grain, antique bronze, wine red, muted violet, and black-plum shell match the selected Pluto direction.
- Image quality and assets: the project uses the generated 1203 x 1308 Image2 background, the real dynamic BodyGraph SVG, and the planetary icon font. No chart screenshot is used as a texture.
- Copy and content: empty, generated, Chinese-address, status, and bilingual states were checked.

**Functional Verification**

- Seven engine regression tests pass.
- Chinese address search returned and selected `湖南省湘潭市雨湖区` without a `400` response.
- The selected address generated 13 Design and 13 Personality activations with Swiss Ephemeris.
- A real desktop PNG and a real mobile PNG were downloaded, reopened, dimension-checked, and visually inspected.
- Mobile document width remains `390px` with no page-level horizontal overflow.
- Browser console: no application warnings or errors.

**Comparison History**

- Pass 1: removed the full-chart screenshot previously embedded behind the live chart.
- Pass 2: added fixed export geometry and locked form/language mutations during capture.
- Pass 3: replaced the plain result background with a safe, content-free Image2 vellum asset.
- Pass 4: removed the invalid `lang=zh` Photon parameter and over-restrictive `osm_tag=place` filter.
- Pass 5: added Chinese administrative-suffix segmentation and increased the search timeout from 8 to 12 seconds.
- Pass 6: preloaded and decoded the Image2 background before html2canvas capture, then verified matching desktop/mobile outputs.

**Follow-up Polish**

- P3 only: the exact production BodyGraph remains slightly narrower than the concept illustration to preserve all gate numbers and channel geometry at export resolution.
