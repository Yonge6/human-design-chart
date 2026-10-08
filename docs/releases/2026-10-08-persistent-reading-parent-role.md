# Persistent readings and parent identity

Source: 906ca42bc9cecb2c69a4f5869a3103587fcc913b. Static release: 3a00a5a.

User explicitly requested saved readings survive reopening without a five-minute timeout. The optional device-local cache now defaults to no TTL and survives page reload through namespaced localStorage. Account ID, person revision and chart hash remain part of every key. Initial same-account hydration preserves saved entries; logout or account switch clears them. Explicit refresh, person edits/deletion and generation still invalidate caches. Blocked/full storage falls back to memory. Storage is device-local, not a replacement for cloud records, and holds private source/readings in the same browser profile; browser data removal also removes it. Limit is 100 cached records to match the people-list cap.

Parent-title defect: guide context previously included the broad relationship category, not the nickname. The generation prompt now includes a canonical explicit role when the profile relationship or exact familiar title specifies mother/father/etc. Unknown roles must use neutral wording, not infer gender from age, chart or family category. Existing mother/father contradictions produce a warning; saved prose is not globally replaced and still requires regeneration. No real user reading was regenerated during verification.

227 tests passed, including persistence across cache-instance recreation and elapsed time, owner/revision isolation, namespace-only clearing, unavailable storage, and mother versus broad-parent prompt cases.
