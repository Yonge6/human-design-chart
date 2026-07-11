# Human Design Calculation Pipeline

## First principles

1. Convert the entered local wall time to UTC with the historical IANA timezone offset. Reject wall times skipped by a daylight-saving transition; if clocks repeated the entered time, use the earlier occurrence consistently.
2. Use Swiss Ephemeris with bundled SE1 data files (not the lower-precision Moshier fallback) to calculate tropical geocentric longitudes for the Sun, Moon, true lunar node, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto. Earth and the south node are the exact 180-degree oppositions of the Sun and true north node.
3. Find the Design instant by solving for the moment when the Sun is exactly 88 degrees behind its birth longitude. This is a solar-arc root search, not a fixed subtraction of 88 days.
4. Convert every longitude to Human Design substructure. Gate 25 begins at 358.25 degrees, each gate spans 5.625 degrees, each line spans 0.9375 degrees, followed by 6 Colors, 6 Tones, and 5 Bases.
5. Combine Personality and Design activations. A channel is defined only when both gates in one of the 36 canonical channel pairs are active. Its two centers become defined.
6. Derive Type, Authority, and Definition from graph connectivity. Profile comes from Personality Sun line / Design Sun line. Incarnation Cross uses Personality Sun/Earth and Design Sun/Earth.
7. Paint the SVG by gate attributes: `data-gate-number` controls gate markers and `data-gate-line` controls the two Personality/Design channel tracks. Calculation never depends on pixels or Image2 output.

Mainland Chinese locations use the nationwide official civil timezone (`Asia/Shanghai`) even when a geographic timezone boundary library returns `Asia/Urumqi`. Historical offsets come from the browser's IANA timezone data; pre-1970 results can vary on runtimes with reduced historical data.

## Reference verification

Reference input: `1990-01-01 12:00`, `Asia/Shanghai`.

- Design instant: `1989-10-05 18:01 UTC`, matching My Human Design.
- 26 of 26 Gate.Line activations match.
- All 26 Gate/Line/Color/Tone/Base activation records match for this reference chart.
- Type, Strategy, Authority, Profile, Definition, defined centers, Incarnation Cross, Digestion, Sense, and Environment match.
- An additional eight UTC fixtures across 1965-2025 produced 208 of 208 matching Gate.Line activations.
- Swiss-file regressions verify `1900-10-16 08:00 UTC` as Profile `2/4` and `1900-04-27 14:00 UTC` as true-node `9.6`, preventing silent fallback to Moshier.

The public My Human Design frontend was also inspected. Its `chart.js` sends birth inputs to `api.myhumandesign.com/chart`; its result script paints a pre-authored SVG from the returned activation data. The independent implementation in this repository performs the astronomical calculation locally instead of depending on that chart endpoint.
