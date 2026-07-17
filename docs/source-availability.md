# Source availability

Every public build displays its application version, deployed Commit SHA, build date, AGPL license, and repository link in Privacy Settings and the Legal page.

1. Open the deployed application's Privacy Settings or Legal page.
2. Copy the displayed Commit SHA.
3. Open `https://github.com/Yonge6/human-design-chart/commit/<sha>` or select the matching release tag.
4. Clone the repository and check out that commit.
5. Run `npm install`, `npm test`, and `npm run build` using the documented environment.

Build metadata comes from `PLUTO_APP_VERSION`, `PLUTO_GIT_COMMIT`, and `PLUTO_BUILD_DATE`; it must not be maintained as a hard-coded production SHA. Development placeholders are shown when variables are absent.

The complete corresponding software source includes engine, renderer, API, Supabase functions/migrations, build scripts, tests, and vendored licensing materials. It does not include production keys, database contents, user data, logs, backups, DNS credentials, or other operational secrets.

Report a mismatch between a deployed build and its linked source through the repository issue tracker. Include the public URL, displayed version/commit/build date, observed asset version, and reproduction steps; do not attach personal birth data, tokens, logs, or backups.
