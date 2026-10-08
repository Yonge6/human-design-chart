# Plain-language composite relationship guide

## Scope

H5 guide rendering and generation prompt only. No API, database or native release is required. Existing saved readings are preserved; the user can explicitly update them once to use the new structure. Reading the structural summary does not call AI or consume quota.

## Content design

Keep all six categories. Expand overview to five short, labelled paragraphs (550–750 Chinese characters): know yourself, know the other person, what the combined chart contains, what to observe together, and one small next step. Other categories focus on communication/decisions, emotion/rhythm, support/friction, repair/boundaries, and daily practice, each 200–300 Chinese characters. Explain terminology in everyday language, include usable examples, and separate growth-record facts from chart hypotheses. Preserve explicit parent identity and known age. No matching score, destiny claim, diagnosis, invented history or change to individual decision-making authority.

Compute structural facts locally from both complete 26-activation sets, reusing the engine's 36-channel map. Classify shared complete channels, opposite hanging gates completing together, one full versus no gates, and one full versus one gate. Track combined defined centers and centers not previously defined in either individual chart. Incomplete/invalid activation sets remain unknown rather than being represented as zero connections. Do not recalculate ephemerides, contact AI, or fetch data when deriving these facts.

The summary is directly readable in overview; the same compact computed facts go into the generation prompt, below the API's 4,000-character per-message limit. Both existing guide-source and compact person-chart formats are supported. Persistent reading cache/account isolation behavior is unchanged.

## Reference boundary

Structural vocabulary checked against [Jovian Archive partnership analysis](https://jovianarchive.com/pages/understanding-partnership-analysis-in-human-design) and [channel relationship patterns](https://jovianarchive.com/blogs/chart-interpretations-components/how-channels-shape-your-energy-flow-and-relationships). These describe the Human Design system, not scientific validation of relationship or personality predictions. The UI and generation instructions deliberately do not assert inevitable attraction, conflict, dominance or compatibility.

## Verification

- 232 automated tests pass, including all 36 channel endpoint pairs, mutually exclusive classifications, directional ownership, newly defined centers, incomplete data, format parity, non-mutation, prompt input limit, mother identity, and the existing cache/privacy/database regression suite.
- Browser fixture mounts the real relationship component with a mock account and saved local guide. Opening the guide reads the persistent cache without source/manual/AI requests. Five summary paragraphs and five bold labels appear.
- Desktop and 390px mobile dialogs have no horizontal overflow; mobile screenshot inspected at `/tmp/buer-composite-mobile.png`.
- No real account records or AI readings were changed during QA. Prompt quality constraints are verified; no claim is made that previously saved AI prose has been regenerated.
