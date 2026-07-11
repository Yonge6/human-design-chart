# Human Design BodyGraph

Browser-side Human Design chart generator with a Swiss Ephemeris WASM calculation engine and a dynamic SVG BodyGraph.

## Local preview

```bash
python3 server.py
```

Open `http://127.0.0.1:8789/`.

The birth data stays in the browser during chart calculation. Birth locations support global free-form input with optional OpenStreetMap-powered suggestions. Selecting a suggestion maps its coordinates to an IANA timezone locally; the full timezone menu remains available as a manual fallback.

## Calculation

See [ALGORITHM.md](ALGORITHM.md) for the complete calculation chain and verification evidence.

## Licensing

The browser astronomy engine is based on Swiss Ephemeris and is distributed under AGPL-3.0 in this prototype. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before commercial deployment.
