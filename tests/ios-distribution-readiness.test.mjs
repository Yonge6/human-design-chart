import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";

import { determineStatus } from "../scripts/ios-distribution-readiness.mjs";

const gitignore = fs.readFileSync(".gitignore", "utf8");
const exportOptions = fs.readFileSync(
  "ios/ExportOptions-AppStoreConnect.plist.example",
  "utf8",
);
const readinessScript = fs.readFileSync(
  "scripts/ios-distribution-readiness.mjs",
  "utf8",
);
const signingGuide = fs.readFileSync(
  "docs/app-store-distribution-signing.md",
  "utf8",
);
const project = fs.readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
const infoPlist = fs.readFileSync("ios/App/App/Info.plist", "utf8");
const appIconContents = fs.readFileSync(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json",
  "utf8",
);
const launchScreen = fs.readFileSync(
  "ios/App/App/Base.lproj/LaunchScreen.storyboard",
  "utf8",
);

test("Apple signing files and local release artifacts are ignored", () => {
  for (const pattern of [
    "*.cer",
    "*.p12",
    "*.pem",
    "*.mobileprovision",
    "*.provisionprofile",
    "*.ipa",
    "*.xcarchive",
    "AuthKey_*.p8",
    "ios/ExportOptions-*.plist",
  ]) {
    assert.match(gitignore, new RegExp(pattern.replaceAll("*", "\\*").replaceAll(".", "\\.")));
  }
  assert.match(gitignore, /!ios\/ExportOptions-AppStoreConnect\.plist\.example/);
});

test("no tracked file contains signing secrets or private signing artifacts", () => {
  const tracked = execFileSync("git", ["ls-files", "-z"])
    .toString()
    .split("\0")
    .filter(Boolean);
  const forbiddenExtensions = /\.(?:cer|p12|pem|mobileprovision|provisionprofile|ipa|xcarchive|p8)$/i;
  assert.deepEqual(
    tracked.filter((path) => forbiddenExtensions.test(path)),
    [],
    "Tracked Apple signing or private-key artifact found.",
  );

  const privateKeyMarker = new RegExp([
    "-----BEGIN ",
    "(?:RSA |EC |OPENSSH |ENCRYPTED )?",
    "PRIVATE KEY-----",
  ].join(""));
  const plaintextPassword = /(?:P12|CERTIFICATE|SIGNING|MATCH|APPLE)[A-Z0-9_]*PASSWORD\s*[:=]\s*["']?(?!<|example|placeholder)[^\s"']+/i;
  for (const path of tracked) {
    if (!fs.existsSync(path) || fs.statSync(path).size > 1024 * 1024) continue;
    const content = fs.readFileSync(path);
    if (content.includes(0)) continue;
    const text = content.toString("utf8");
    assert.doesNotMatch(text, privateKeyMarker, `Private key marker found in ${path}`);
    assert.doesNotMatch(text, plaintextPassword, `Plaintext signing password found in ${path}`);
  }
});

test("ExportOptions example is local-only, current, and contains no credentials", () => {
  assert.match(exportOptions, /<key>method<\/key>\s*<string>app-store-connect<\/string>/);
  assert.match(exportOptions, /<key>destination<\/key>\s*<string>export<\/string>/);
  assert.match(exportOptions, /<key>signingStyle<\/key>\s*<string>automatic<\/string>/);
  assert.match(exportOptions, /<key>teamID<\/key>\s*<string>L855ZVM679<\/string>/);
  assert.match(exportOptions, /<key>manageAppVersionAndBuildNumber<\/key>\s*<false\/>/);
  assert.doesNotMatch(exportOptions, /Apple ID|password|private key|upload/i);
  assert.match(signingGuide, /does not prove that a matching profile exists/i);
});

test("distribution diagnostic is read-only and reports blocked and manual states", () => {
  for (const forbidden of [
    "-allowProvisioningUpdates",
    "-exportArchive",
    "iTMSTransporter",
    "notarytool",
    "altool",
    "security import",
    "set-key-partition-list",
  ]) {
    assert.doesNotMatch(readinessScript, new RegExp(forbidden, "i"));
  }
  assert.match(readinessScript, /find-identity/);
  assert.match(readinessScript, /security", \["cms", "-D", "-i"/);
  assert.match(readinessScript, /-showBuildSettings/);
  assert.match(readinessScript, /BLOCKED:/);
  assert.match(readinessScript, /MANUAL:/);
  assert.match(readinessScript, /PASS:/);
  assert.equal(determineStatus({ blockers: ["missing"], manual: [] }), "BLOCKED");
  assert.equal(determineStatus({ blockers: [], manual: ["review"] }), "MANUAL");
  assert.equal(determineStatus({ blockers: [], manual: [] }), "PASS");
});

test("Release signing settings and shipped capabilities remain minimal", () => {
  assert.equal((project.match(/CODE_SIGN_STYLE = Automatic;/g) || []).length, 2);
  assert.equal((project.match(/DEVELOPMENT_TEAM = L855ZVM679;/g) || []).length, 2);
  assert.equal((project.match(/CODE_SIGN_IDENTITY = "iPhone Developer";/g) || []).length, 2);
  assert.doesNotMatch(project, /CODE_SIGN_ENTITLEMENTS/);
  assert.doesNotMatch(project, /SystemCapabilities/);
  assert.match(infoPlist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
  assert.match(infoPlist, /<key>UILaunchStoryboardName<\/key>\s*<string>LaunchScreen<\/string>/);
  assert.match(project, /Assets\.xcassets in Resources/);
  assert.match(appIconContents, /"size"\s*:\s*"1024x1024"/);
  assert.match(launchScreen, /launchScreen/);
});
