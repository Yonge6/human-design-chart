# Warm editorial UI release — 2026-09-26

User explicitly authorized publication.

- Site: https://buer.wonderelian.com/
- Source: b5e810f98abe0e8958f2bfed7344bf4f904f6e65 (codex/buer-ui-redesign)
- Artifact repository: Yonge6/buer-life-manual-preview, main
- Artifact commit: 7d68a3e7f5774a8d60030c397ae7ed991edaee5c
- Previous artifact / rollback: 00d02af70b21a3f2be3561353ac40f77f54edb61
- GitHub Pages run: 36243456268, success
- Build: node scripts/build-buer-preview.mjs, after tests (Pages test rebuilds dist and must not be published).
- Runtime restored explicit source provenance, dedicated API endpoint, public URL and QR path. Existing independent-site environment label is preview.
- Tests: 138 passed; build security 3 passed; Pages checks 5 passed.
- Public verification: 97/97 artifact files match SHA-256; details in editorial-live-verification.json.
- In-app browser reloaded canonical URL and displayed warm ivory homepage, two question rows, sage controls, supplied brand ring and editorial photography. Both saved-report context toggles display correctly for a profile with a manual.
- No backend deployment, native installation or App Store resubmission performed.

Rollback by publishing the previous artifact tree as a new commit in the artifact repository; retain domain configuration and the dedicated API.
