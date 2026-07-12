final result: passed

**Source visual truth**

- Previous mobile implementation: `/Users/yongyuan/Documents/人类图/qa-mobile-form-v5.png`.
- Existing selected Image2 asset: `/Users/yongyuan/Documents/人类图/assets/pluto-form-mobile-v4.png`.
- User requirement: fit the complete form and Pluto composition in one iPhone viewport, then order the mobile result as graph, Design/Personality, and properties.

**Implementation evidence**

- Full-view before/after comparison: `/Users/yongyuan/Documents/人类图/qa-mobile-home-comparison-v8.png`.
- Final empty mobile home: `/Users/yongyuan/Documents/人类图/qa-mobile-home-v8.png`.
- Final mobile result first viewport: `/Users/yongyuan/Documents/人类图/qa-mobile-result-v8.png`.
- Focused Design/Personality region: `/Users/yongyuan/Documents/人类图/qa-mobile-columns-v8.png`.
- Reopened mobile-triggered download: `/Users/yongyuan/Downloads/顺序验证-human-design-chart.png` (`2256 x 2424`).

**Viewport and state**

- Primary viewport: `390 x 844`, empty Chinese form.
- Secondary viewport: `375 x 812`, populated Chinese form.
- Generated state: `顺序验证`, 1990-01-01 12:00, `湖南省湘潭市雨湖区`.
- Both mobile home states have document height equal to viewport height and no horizontal or vertical page scroll.

**Findings**

- No P0/P1/P2 issues remain.
- Typography: the display face, compact labels, and button hierarchy remain consistent with the Pluto visual direction; no text clips at either iPhone width.
- Spacing: the mobile header, controls, and form rhythm were compressed without reducing controls below 40px. The full form and Pluto artwork now end inside the first viewport.
- Colors: antique gold, near-black, ivory, and bronze remain unchanged from the selected direction.
- Image quality: the original Image2 Pluto bitmap is reused at native mobile proportions with bottom anchoring; no stretched or replacement artwork was introduced.
- Copy: all bilingual labels and Photon attribution remain unchanged.
- Result order: the BodyGraph is first, Design is second, Personality is third, and the property grid is last.
- Download: mobile and desktop use the same fixed desktop export composition. The reopened PNG contains the complete BodyGraph, both planetary columns, and all properties without clipping.

**Comparison history**

- Pass 1 found that the old mobile form extended beyond the viewport and hid the Pluto subject below the fold.
- Fix: reduced mobile-only vertical spacing, used a viewport-bound form shell, and bottom-anchored the existing Image2 asset.
- Pass 2 confirmed `390 x 844` and `375 x 812` both have zero page overflow and show the Pluto composition in one screen.
- Pass 3 changed mobile visual ordering with CSS only, preserving the desktop DOM and export layout.
- Pass 4 reopened the real `2256 x 2424` PNG and confirmed the previously clipped export frame is now fully visible.

**Functional verification**

- Chinese Photon location selection and local Swiss Ephemeris generation completed successfully.
- Mobile edit and download actions remain functional.
- Seven engine regression tests pass.
- `node --check` and `git diff --check` pass.

**Follow-up polish**

- P3 only: on very short legacy iPhone heights, less of the surrounding star field is visible, but the page still remains a single screen and all controls stay accessible.
