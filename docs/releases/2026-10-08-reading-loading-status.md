# Relationship reading and loading release

- Source: `54d297e77f84cd037c31c9663caeebf190d43f7b`
- H5 release: `69b7c9a74400c4a7c57408ff49f286177744af71`
- GitHub Pages run: `37722336806`, completed successfully.
- Surface: https://buer.wonderelian.com/ ; no native release or backend schema changes.

## Changes

- Defined/present values use green labels; undefined/absent values use gray outlined labels. Text remains available independently of color.
- Person advanced chart properties are recalculated from validated saved birth inputs through the existing manual engine. Chart hash validation remains enforced; no saved profile is overwritten.
- All six saved relationship sections render as paragraphs without regenerating or consuming AI quota.
- Generation buttons display preparation, generation and saving states and disable duplicate submissions; existing save retry behavior is retained.
- Static homepage text and color placeholders appear before application imports complete; a standalone timer exposes a retry link on prolonged loading.

## Verification

- Full sequential suite: 222 passed, 0 failed.
- Chart reconstruction tests cover Shanghai and ambiguous New York DST input and assert five advanced properties exist without mutating the person snapshot.
- Browser local 390px check: document scroll width 390px; status badges and three reading paragraphs rendered correctly using synthetic content.
- Blocking app.js preserved the homepage preview; prolonged loading exposed retry; unblocking restored the app and hid the preview.
- Fresh public browser verified the source revision, initialized homepage, hidden ready-state preview, and deployed modules containing status labels, full-property reconstruction, paragraph formatting and generation text.
- No real AI requests or private account mutations were used for verification. Generation phase behavior was code-reviewed, not exercised with a live paid request.
