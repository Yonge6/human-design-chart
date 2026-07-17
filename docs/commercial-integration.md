# Commercial integration

A separate proprietary product may call a deployed instance of this open-source service through its public HTTPS/JSON API.

## Allowed

```js
const response = await fetch(
  "https://api-human-design.wonderelian.com/v1/charts",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      birthDate: "1990-01-01",
      birthTime: "12:00",
      timezone: "Asia/Shanghai",
      locationLabel: "Wuhan, China",
    }),
  },
);

if (!response.ok) throw new Error("Chart request failed");
const { data } = await response.json();
if (data.verificationStatus !== "engine_verified") {
  throw new Error("An authoritative engine result is required");
}
```

A lightweight client may contain only HTTP requests, public TypeScript types, timeout/retry behavior, and public error handling. It must not contain Swiss Ephemeris, WASM, calculation rules, or BodyGraph rendering code. The example under `examples/http-client/` follows that boundary.

Future proprietary products must obtain authoritative charts directly from `POST /v1/charts`. A cloud record marked `client_asserted` proves only schema, canonical-hash, and structural validation; it must not be treated as proof that the server reran Swiss Ephemeris.

## Prohibited

```js
import { calculateHumanDesign } from "human-design-chart";
```

Do not publish a private calculation SDK, copy this engine into a proprietary service, directly access its database, or bundle this repository/submodules into the proprietary app. Deploy the open-source API separately and retain its source correspondence and AGPL obligations.

This is an architectural boundary, not a final legal opinion. Obtain qualified legal advice for the intended deployment and confirm relevant third-party rights.
