# Direct person actions and reading cache

Source e169b2f75ec78d4309bd5b5ebbf0fe2e09d19575. Static release 80051bb.

- Removed initial-circle avatars from every person card.
- Removed intermediate person-detail dialog. Cards now open the manual and editor directly, alongside relationship guide and chat. Return actions go to the people list. People with no precise chart retain editing/chat, without a misleading manual link.
- Relationship readings preserve existing Markdown bold and emphasize short plain-text paragraph labels ending with a colon. Shared by all six sections; text stays DOM-escaped and saved content is unchanged.
- Account/person-revision/chart-hash keyed memory cache: five-minute TTL, at most 32 entries, no browser-storage persistence. Logout/account change, explicit refresh, person save/delete and guide generation invalidate it. Saved guide updates replace the cached reading. Cross-device changes can be fetched using Reload latest version; cache is not represented as live data.

Verification: 224 tests passed. Browser synthetic fixture confirmed no avatars and four direct card buttons; manual and editor dialogs open and return without the removed detail page. At 390px the page width equals scroll width. First guide open made one source/manual read each; the second open made no additional source/manual requests. Explicit reload incremented both counts to two. Plain labels rendered as strong with computed font-weight 700. Tests cover account/revision isolation, TTL, clone isolation and cache clearing. No live AI request or private-account mutation was used.
