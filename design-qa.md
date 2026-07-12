final result: passed

**Visual target and evidence**

- Reference direction: the user-selected Pluto Human Design concept and the existing dark bronze visual system.
- Mobile Image2 asset: `/Users/yongyuan/Documents/人类图/assets/pluto-form-mobile-v4.png`.
- Seamless Image2 export asset: `/Users/yongyuan/Documents/人类图/assets/pluto-vellum-bg-v4.png`.
- Mobile form at 390 x 844: `/Users/yongyuan/Documents/人类图/qa-mobile-form-v5.png`.
- Mobile generated result at 390px wide: `/Users/yongyuan/Documents/人类图/qa-mobile-result-v5.png`.
- Reopened production PNG: `/Users/yongyuan/Downloads/Mobile-human-design-chart.png` (`2256 x 2302`).

**Design comparison**

- The mobile form preserves the selected near-black, antique bronze, crescent, celestial-orbit, and Pluto-planet direction without embedding UI or text in the bitmap.
- The primary action uses the same antique-gold fill as the selected language control.
- The mobile hierarchy fits 390px with no horizontal overflow; the Pluto planet rises from the bottom without obscuring controls.
- The result keeps the production BodyGraph readable and uses the ivory celestial vellum direction selected for the chart.
- The regenerated vellum is a continuous sheet. The exported PNG has no center fold, vertical seam, stale mobile-width frame, or visible chart action buttons.

**Required states and interactions**

- Initial state: form visible, chart hidden.
- Chinese location state: `湖南省湘潭市雨湖区` returns a selectable Photon result on mobile.
- Selected location stores coordinates and resolves mainland China to `Asia/Shanghai` internally without showing a timezone field.
- Submit state: calculation completes locally, form hides, chart appears, and viewport scrolls to the result.
- Edit state: `重新填写` restores the populated form and clears stale status text.
- Language state: Chinese and English labels switch correctly; English attribution is `Location search by Photon.`
- Export state: a real PNG downloads and reopens successfully with deterministic `2256 x 2302` geometry.

**Functional verification**

- Mobile viewport: `390 x 844`, document width `390`, no horizontal scrolling.
- Swiss Ephemeris calculation completed with 13 Design and 13 Personality activations.
- Seven engine regression tests pass.
- `node --check`, test suite, and diff whitespace checks pass.

**Remaining polish**

- P3 only: the mobile result is intentionally long so all gates, activations, and properties remain legible instead of being compressed into an unreadable poster.
