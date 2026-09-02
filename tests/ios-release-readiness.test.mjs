import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const project = fs.readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const capacitorConfig = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const privacyManifest = fs.readFileSync("ios/App/App/PrivacyInfo.xcprivacy", "utf8");
const reviewReadiness = fs.readFileSync("docs/app-store-review-readiness.md", "utf8");
const metadataDraft = fs.readFileSync("docs/app-store-metadata-draft.md", "utf8");
const releaseChecklist = fs.readFileSync("docs/app-store-release-checklist.md", "utf8");
const releaseAvailability = fs.readFileSync("src/app/release-feature-availability.js", "utf8");

test("iOS release identity and versions remain aligned", () => {
  assert.equal(packageJson.version, "1.1.0");
  assert.equal(capacitorConfig.appId, "com.yonge6.plutolifemanual");
  assert.equal((project.match(/MARKETING_VERSION = 1\.1\.0;/g) || []).length, 2);
  assert.equal((project.match(/CURRENT_PROJECT_VERSION = 3;/g) || []).length, 2);
  assert.equal((project.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.yonge6\.plutolifemanual;/g) || []).length, 2);
  assert.ok((project.match(/IPHONEOS_DEPLOYMENT_TARGET = 15\.0;/g) || []).length >= 2);
});

test("the app privacy manifest is packaged and declares no tracking", () => {
  assert.match(project, /PrivacyInfo\.xcprivacy in Resources/);
  assert.match(privacyManifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.doesNotMatch(privacyManifest, /NSPrivacyCollectedDataTypeCoarseLocation/);
  assert.match(
    reviewReadiness,
    /Manually entered birth-place search text is not the user's or device's\s+current location/,
  );
});

test("App Store drafts preserve legal and deployment blockers", () => {
  for (const document of [reviewReadiness, metadataDraft, releaseChecklist]) {
    assert.match(document, /Swiss Ephemeris/);
    assert.match(document, /BodyGraph/);
    assert.match(
      document,
      /Phase 6B[\s\S]{0,320}(?:implements|removes|native-runtime capability gate)/i,
    );
  }
  assert.match(
    reviewReadiness,
    /Photon and ArcGIS retention behavior and the final App Privacy classification\s+remain an unresolved privacy gate/,
  );
  assert.doesNotMatch(metadataDraft, /Reviewers should not expect those optional controls/);
  assert.match(metadataDraft, /Do not submit a final content-rights declaration/);
  assert.match(releaseChecklist, /generic\/platform=iOS/);
});

test("Phase 6B removes unavailable native remote features without advertising them to review", () => {
  for (const document of [reviewReadiness, metadataDraft, releaseChecklist]) {
    assert.match(document, /Phase 6B/);
    assert.match(document, /hidden|removed/i);
    assert.match(document, /test/i);
  }
  assert.match(releaseAvailability, /isNativeRuntime && !hasSupabaseConfig/);
  assert.match(releaseAvailability, /remoteSettingsVisible: false|remoteSettingsVisible/);
  assert.match(releaseAvailability, /remoteOperationsAllowed: remoteRuntimeAllowed && remoteSettingsVisible/);

  const reviewNotes = metadataDraft.match(/## App Review Notes([\s\S]*?)## Age Rating Draft/)?.[1] || "";
  assert.doesNotMatch(reviewNotes, /Cloud Save|anonymous analytics|Delete Cloud Data/i);
  assert.match(reviewNotes, /Photon/);
  assert.match(reviewNotes, /ArcGIS/);
});
