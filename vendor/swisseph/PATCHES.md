# Browser bundle patch

The vendored `@swisseph/browser` 1.1.1 distribution contained unresolved enum references in its generated browser bundle. The local compatibility patch replaces the chart calculation path's enum-derived defaults and flag normalization with their documented numeric values. Human Design calculations then pass `258` explicitly (`SwissEphemeris | Speed`) and reject any returned flag set that does not include Swiss Ephemeris mode.

The complete upstream source and build system are available at https://github.com/swisseph-js/swisseph. The generated JavaScript and WASM used by this deployment are included beside this file.
