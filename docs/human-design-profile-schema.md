# HumanDesignProfileSnapshot v1

`HumanDesignProfileSnapshot` is the stable data boundary between the open-source engine and API consumers. Its JSON Schema is `schemas/human-design-profile-v1.schema.json`.

## Versioning

- `schemaVersion` identifies the public data contract. v1 uses `1.0`.
- `engineVersion` identifies calculation behavior independently. The current value is `1.0.0`.
- `verificationStatus` records provenance: `client_asserted` or `engine_verified`.
- Additive optional fields should remain backward compatible.
- Removing, renaming, changing meaning/type, or making an optional field required needs a new major schema version and endpoint migration plan.
- API results always include both versions.

## Structure

- `input`: normalized local civil date (`YYYY-MM-DD`), 24-hour time (`HH:mm`), IANA time zone, and display-only location label.
- `core`: type, strategy, authority, profile, definition, and incarnation cross.
- `activations`: complete Personality and Design planet maps with Gate/Line/Color/Tone/Base and longitude.
- `structure`: defined centers, complete channels, and variable arrows.
- `meta`: Swiss Ephemeris, True Node, 88-degree solar arc, resolved UTC instant, and design Julian day.

`generatedAt` records when the envelope was produced; it is not part of chart identity.

`client_asserted` means the open-source backend validated the schema, field ranges, legal channel/center values, and canonical hash, but did not rerun Swiss Ephemeris. It is not an authoritative engine recalculation. `engine_verified` is emitted only by `POST /v1/charts` after the server runs the shared Swiss Ephemeris engine. Browser cloud uploads cannot claim `engine_verified`, and future proprietary consumers must call `/v1/charts` when they require authoritative results.

## Stable chart hash

`chartHash` is `sha256:` plus SHA-256 of canonical JSON. Object keys are recursively sorted, so property order does not matter. The hash includes normalized birth date/time/timezone, schema and engine versions, core output, activations, structure, and the calculation method metadata.

The hash excludes name, `generatedAt`, random/request IDs, language, `locationLabel`, and `verificationStatus`. This makes the same calculation reproducible across bilingual presentations, local/API provenance, and repeated generation. A change to calculation output or a relevant engine version intentionally changes the hash.

Both `schemaVersion` and `engineVersion` are intentionally included in identity. If calculation behavior changes, publish a new engine version: old and new records remain distinguishable by both version fields and `chartHash`. A breaking protocol change uses a new major schema version and therefore also produces a new hash namespace. Consumers must compare versions before treating two snapshots as semantically equivalent.

Names are never part of the core snapshot protocol. An explicitly consented cloud record may store a name separately from the snapshot/hash.

The dependency-free canonical contract lives in `supabase/functions/_shared/human-design-profile-contract.js`. Browser and Node modules re-export that same source, while Deno Edge imports it directly. Unit tests assert the import identity and real Supabase integration tests submit the same Swiss Ephemeris fixture through Edge, preventing hash drift between runtimes.
