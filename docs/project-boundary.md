# Project boundary

## Included in this open-source project

- Swiss Ephemeris integration and historical time-zone conversion
- Human Design calculation, Gate/Line/Color/Tone/Base, Personality and Design
- Type, strategy, authority, definition, profile, incarnation cross, variables
- BodyGraph and poster rendering
- Bilingual UI, basic readings, local history, and privacy settings
- Versioned public API and profile snapshot protocol
- Backend code used by this tool: migrations, RLS, Edge Functions, consent, optional cloud charts, anonymous events, deletion, and administration audit records
- Build, deployment, and automated tests

Open source applies to software, not to production user data. Production database contents, logs, backups, credentials, abuse controls, and infrastructure secrets are not distributed as source.

## Outside this repository

A future proprietary product may provide AI conversations, an AI life adviser, long-term user profiles, journals and memory, life-stage analysis, relationship/career/decision support, memberships, payments, CRM, orders, communities, recommendations, private prompts, agent orchestration, and commercial administration. Those features are not implemented here.

## Only supported connection

```text
Proprietary product
       |
       | HTTPS / JSON
       v
Open-source Human Design API
       |
       v
Swiss Ephemeris + Human Design engine
```

The proprietary product may depend on the public API contract and `HumanDesignProfileSnapshot`, not on engine internals.

## Prohibited tight integration

- Direct JavaScript/TypeScript import of calculation modules
- Static or dynamic linking to the engine
- Embedding engine code in an npm package or private SDK
- Packaging this repository as a Git submodule
- Embedding `swisseph.wasm`, Swiss Ephemeris binaries, or ephemeris files
- Copying Human Design core calculation or BodyGraph rendering code
- Sharing a process, build graph, or build artifact
- Directly querying or depending on internal database tables

This architecture is intended to create a clear technical separation between the open-source Human Design tool and future proprietary products. Final licensing conclusions should be reviewed by qualified legal counsel or confirmed with the relevant rights holders.
