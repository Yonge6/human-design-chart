# Buer subscription release implementation plan

Goal: Submit the current native Buer Within app worldwide, English primary, with three free AI conversations per day and monthly/annual StoreKit subscriptions.
Architecture: StoreKit 2 provides localized pricing, purchases, restore and signed transactions. Server verifies Apple signatures and expiration; durable daily usage is keyed by an anonymous installation identifier. Successful replies consume quota; failed replies release reservations. Subscribers have no daily count limit and retain rate limits.
Tech stack: Capacitor, Swift StoreKit 2, Node HTTPS API, Apple App Store Server Library.

1. Inspect existing rejected app and review messages; recover reviewer contact from Style Atlas and verify account data. Record current state before changes.
2. Implement native StoreKit purchase/status/restore methods and persistent anonymous device ID; test cancellation, pending, expiration and restore.
3. Implement durable daily server quota with atomic reservations, verified transactions and no client-controlled entitlement. Test concurrency, day rollover, failures, forged proofs and persistence.
4. Add bilingual paywall showing StoreKit prices, auto-renewal terms, restore/manage, privacy and EULA. Add AI data sharing consent and quota messaging.
5. Configure one subscription group with monthly/annual products. US 9.99/89.99; China 19.90/159.00 if exact Apple tiers are offered; other regions automatic equivalents. No trial or introductory offer.
6. Prepare English-primary metadata, actual iPhone/iPad screenshots, privacy disclosures, review notes and subscription screenshots. Preserve actual feature boundaries (native text readings, no full chart).
7. Test complete native paths, archive/sign/upload, verify processed build. Attach products/build/assets and submit. Read back Waiting for Review or report exact blocker without claiming submission.

## Independent app identity

User requested a new app rather than changes to Pluto. New Apple app ID: 6814764726; bundle ID: com.yonge6.buerwithin; version 1.0. The old Pluto record and installed app remain separate. New subscriptions use the new bundle prefix.

2026-09-22: New app and subscription records created. US/CN pricing read back at 9.99/89.99 USD and 19.90/159.00 CNY. Subscription availability configured for 175 territories. Signed archive and distribution export succeeded. Submission is not yet complete.
