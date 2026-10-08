# Daily 100 replies and pair overview polish

- Source: `7d68f5781d0bde0da0b483e1d97866762596ae0b`.
- Static release: `35bcc6c1161468ca1b5c21d26ff2f257972b4695`; fingerprint `442cca3a8776b2af`.
- Pages run `37720553481`: success.
- API active release: `/srv/buer-jianji/releases/20261008-quota100-85e8035`.

Daily free completed replies increased from 3 to 100. Failed requests are refunded; concurrent reservations, persisted usage, UTC midnight reset and membership/rate limits are unchanged. Existing installation-based quota identity is unchanged. No usage records reset or edited.

Pair overview chart disclosure has a clickable chevron and keyboard focus treatment. Growth-source detail display removed without changing generation inputs. Pair facts use the existing manual value translator; cross names now have shared Chinese labels, with gate numbers preserved.

Validation: 214 unit tests passed; diff check clean. Deployed quota module independently tested in memory only: first 100 accepted, 101st rejected; no AI call or user quota consumed. Public membership dialog displayed 100/day. Browser synthetic disclosure fixture on deployed CSS expanded on click and reversed the arrow. All engine cross names have Chinese-label test coverage. Public runtime independently reports source 7d68f57. No native rebuild or App Store submission.
