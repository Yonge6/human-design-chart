# Human Design BodyGraph

Browser-side Human Design chart generator with a Swiss Ephemeris WASM calculation engine and a dynamic SVG BodyGraph.

## Local preview

```bash
python3 server.py
```

Open `http://127.0.0.1:8789/`.

Run the engine regression suite with `npm test`.

The birth data stays in the browser during chart calculation. Birth locations support global type-ahead search with a second geocoder fallback. Suggestions are optional: submitting a typed address resolves it automatically, and mainland Chinese addresses can use the nationwide civil timezone even when search suggestions are unavailable. Coordinates map to an IANA timezone locally; the timezone is used internally for accurate UTC conversion and is not shown as a separate form field.

## Calculation

See [ALGORITHM.md](ALGORITHM.md) for the complete calculation chain and verification evidence.

## Licensing

The browser astronomy engine is based on Swiss Ephemeris and is distributed under AGPL-3.0 in this prototype. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before commercial deployment.
