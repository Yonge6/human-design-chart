final result: passed

**Source visual truth**

- Selected concept: `/Users/yongyuan/.codex/generated_images/019f9d4a-507e-7293-859d-15714854b005/exec-695e3bb1-a8c3-4c54-ab77-fa6404116ed8.png` (`853 x 1844`).
- Implemented page: `http://127.0.0.1:8794/?v=guided-dark-controls`.
- Step 1 capture: `qa/home-step1-390x844.png`.
- Step 2 capture: `qa/home-step2-390x844.png`.
- Step 3 capture: `qa/home-step3-390x844.png`.
- Combined comparison: `qa/design-comparison.png`.

**Comparison setup**

- The selected concept and Step 1 implementation were normalized into adjacent `390 x 844` panels for a single visual comparison input.
- The in-app browser currently enforces a `780 x 844` minimum viewport, so the refreshed implementation panel was downsampled to the comparison panel. The mobile branch is separately covered at `390 x 844` by the responsive E2E suite.
- State: Chinese locale, homepage, Step 1, empty form.
- No separate focused crop was needed because the only first-pass mismatch was the full-width name control, already visible at inspection scale.

**Comparison history**

- First pass finding (P1): the name input used the earlier cream form-control treatment, while the selected concept uses a dark field with a restrained warm-gold outline.
- Fix: all homepage inputs and selects now use the dark surface, gold border, warm text, and visible gold focus treatment.
- Second pass: hierarchy, progress rhythm, field treatment, bottom action area, dark Pluto palette, and warm typography align with the selected concept. No P0, P1, or P2 issue remains.
- Intentional product differences: the existing required-name rule is preserved, and the privacy note truthfully states local-device processing instead of claiming unverified encryption.

**Responsive and interaction QA**

- The Life Philosophy poster and its loading code are absent from the homepage.
- Step 1 contains name only; Step 2 contains date, time, AM/PM, and repeated-clock handling; Step 3 contains birthplace, legal copy, and final generation.
- Back navigation preserves entered values. Existing-record access opens the history drawer.
- Chinese and English strings fit the three-step layout without control overlap.
- The primary journey, validation transitions, back navigation, saved values, chart generation, drawer history, and privacy paths pass in browser automation.
- Browser console inspection found no page errors during the primary three-step interaction.

**Residual polish**

- P3 only: the live product retains its longer `Pluto 人生使用说明书` desktop wordmark and truthful privacy wording instead of copying the concept's abbreviated header and lock claim.
