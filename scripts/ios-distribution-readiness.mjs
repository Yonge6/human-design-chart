import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EXPECTED = Object.freeze({
  bundleId: "com.yonge6.plutolifemanual",
  build: "1",
  deploymentTarget: "15.0",
  marketingVersion: "1.1.0",
  teamId: "L855ZVM679",
});

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

function plistValue(plistPath, keyPath) {
  const result = run("/usr/bin/plutil", ["-extract", keyPath, "raw", "-o", "-", plistPath]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function parseBuildSettings(output) {
  const settings = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+) = (.*)$/);
    if (match) settings[match[1]] = match[2].trim();
  }
  return settings;
}

function profileDirectories() {
  return [
    join(homedir(), "Library/Developer/Xcode/UserData/Provisioning Profiles"),
    join(homedir(), "Library/MobileDevice/Provisioning Profiles"),
  ];
}

function listFiles(root, predicate = () => true) {
  if (!existsSync(root)) return [];
  const output = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...listFiles(path, predicate));
    else if (predicate(path)) output.push(path);
  }
  return output;
}

function decodeProfile(profilePath, temporaryDirectory) {
  const decodedPath = join(temporaryDirectory, `${basename(profilePath)}.plist`);
  const result = run("/usr/bin/security", ["cms", "-D", "-i", profilePath]);
  if (result.status !== 0) return null;
  writeFileSync(decodedPath, result.stdout);

  const teamId = plistValue(decodedPath, "TeamIdentifier.0");
  const applicationIdentifier = plistValue(
    decodedPath,
    "Entitlements.application-identifier",
  );
  const expirationDate = plistValue(decodedPath, "ExpirationDate");
  return {
    applicationIdentifier,
    betaReportsActive: plistValue(
      decodedPath,
      "Entitlements.beta-reports-active",
    ) === "true",
    expirationDate,
    expired: expirationDate ? new Date(expirationDate).getTime() <= Date.now() : true,
    getTaskAllow: plistValue(decodedPath, "Entitlements.get-task-allow") === "true",
    name: plistValue(decodedPath, "Name"),
    provisionsAllDevices: plistValue(decodedPath, "ProvisionsAllDevices") === "true",
    teamId,
  };
}

function inspectProfiles() {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "pluto-profiles-"));
  try {
    const paths = profileDirectories().flatMap((directory) => (
      listFiles(directory, (path) => /\.(?:mobileprovision|provisionprofile)$/i.test(path))
    ));
    return paths
      .map((path) => decodeProfile(path, temporaryDirectory))
      .filter(Boolean);
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
}

function inspectIdentities() {
  const result = run("/usr/bin/security", ["find-identity", "-v", "-p", "codesigning"]);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const identityNames = [...output.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  return {
    development: identityNames.filter((name) => name.startsWith("Apple Development:")),
    distribution: identityNames.filter((name) => name.startsWith("Apple Distribution:")),
  };
}

function inspectProject(rootDirectory) {
  const result = run("/usr/bin/xcodebuild", [
    "-project",
    "ios/App/App.xcodeproj",
    "-scheme",
    "App",
    "-configuration",
    "Release",
    "-showBuildSettings",
  ], { cwd: rootDirectory });
  if (result.status !== 0) {
    return { error: "xcodebuild could not read Release build settings." };
  }
  return parseBuildSettings(result.stdout);
}

function inspectArchive(archivePath) {
  if (!archivePath) return { manual: "Pass --archive <path> to inspect an xcarchive." };
  const resolvedArchive = resolve(archivePath);
  const applicationsDirectory = join(resolvedArchive, "Products/Applications");
  const appPath = existsSync(applicationsDirectory)
    ? readdirSync(applicationsDirectory, { withFileTypes: true })
      .find((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
    : null;
  const resolvedAppPath = appPath ? join(applicationsDirectory, appPath.name) : null;
  const infoPlist = resolvedAppPath ? join(resolvedAppPath, "Info.plist") : null;
  if (!resolvedAppPath || !existsSync(infoPlist)) return { error: "Archived .app is missing." };

  const privacyManifests = listFiles(
    resolvedAppPath,
    (path) => path.endsWith("PrivacyInfo.xcprivacy"),
  );
  const wasm = listFiles(resolvedAppPath, (path) => path.endsWith(".wasm"));
  const se1 = listFiles(resolvedAppPath, (path) => path.endsWith(".se1"));
  const javascript = listFiles(resolvedAppPath, (path) => path.endsWith(".js"));
  const phase6BGate = javascript.some((path) => {
    const content = readFileSync(path, "utf8");
    return content.includes("remoteSettingsVisible")
      && content.includes("isNativeRuntime")
      && content.includes("hasSupabaseConfig");
  });
  const signature = run(
    "/usr/bin/codesign",
    ["--verify", "--deep", "--strict", resolvedAppPath],
  );

  return {
    appPath: resolvedAppPath,
    build: plistValue(infoPlist, "CFBundleVersion"),
    bundleId: plistValue(infoPlist, "CFBundleIdentifier"),
    codeSignValid: signature.status === 0,
    deploymentTarget: plistValue(infoPlist, "MinimumOSVersion"),
    hasNodeModules: listFiles(resolvedAppPath).some((path) => path.includes("/node_modules/")),
    marketingVersion: plistValue(infoPlist, "CFBundleShortVersionString"),
    phase6BGate,
    privacyManifestCount: privacyManifests.length,
    se1Count: se1.length,
    wasmCount: wasm.length,
  };
}

export function determineStatus({ blockers, manual }) {
  if (blockers.length > 0) return "BLOCKED";
  if (manual.length > 0) return "MANUAL";
  return "PASS";
}

export function auditDistributionReadiness({
  archivePath = null,
  rootDirectory = resolve(import.meta.dirname, ".."),
} = {}) {
  const pass = [];
  const blockers = [];
  const manual = [];

  const project = inspectProject(rootDirectory);
  if (project.error) {
    blockers.push(project.error);
  } else {
    const expectedSettings = {
      CURRENT_PROJECT_VERSION: EXPECTED.build,
      DEVELOPMENT_TEAM: EXPECTED.teamId,
      IPHONEOS_DEPLOYMENT_TARGET: EXPECTED.deploymentTarget,
      MARKETING_VERSION: EXPECTED.marketingVersion,
      PRODUCT_BUNDLE_IDENTIFIER: EXPECTED.bundleId,
    };
    for (const [key, expected] of Object.entries(expectedSettings)) {
      if (project[key] === expected) pass.push(`${key}=${expected}`);
      else blockers.push(`${key} expected ${expected}, found ${project[key] || "missing"}`);
    }
    if (project.CODE_SIGN_STYLE === "Automatic") pass.push("Release signing style is Automatic.");
    else blockers.push(`Release signing style is ${project.CODE_SIGN_STYLE || "missing"}.`);
  }

  const identities = inspectIdentities();
  if (identities.development.length > 0) {
    pass.push(`Apple Development identity available (${identities.development.length}).`);
  } else {
    manual.push("No Apple Development identity is available.");
  }
  if (identities.distribution.length > 0) {
    pass.push(`Apple Distribution identity available (${identities.distribution.length}).`);
  } else {
    blockers.push("No Apple Distribution identity with a private key is available.");
  }

  const profiles = inspectProfiles();
  const expectedApplicationIdentifier = `${EXPECTED.teamId}.${EXPECTED.bundleId}`;
  const matchingProfiles = profiles.filter((profile) => (
    profile.teamId === EXPECTED.teamId
    && profile.applicationIdentifier === expectedApplicationIdentifier
    && !profile.expired
    && !profile.getTaskAllow
    && profile.betaReportsActive
    && !profile.provisionsAllDevices
  ));
  if (matchingProfiles.length > 0) {
    pass.push(`Matching App Store profile available (${matchingProfiles.length}).`);
  } else {
    blockers.push(`No unexpired App Store profile matches ${EXPECTED.bundleId}.`);
  }

  const archive = inspectArchive(archivePath);
  if (archive.error) {
    blockers.push(archive.error);
  } else if (archive.manual) {
    manual.push(archive.manual);
  } else {
    const archiveExpectations = [
      ["Bundle ID", archive.bundleId, EXPECTED.bundleId],
      ["Marketing version", archive.marketingVersion, EXPECTED.marketingVersion],
      ["Build", archive.build, EXPECTED.build],
      ["Minimum iOS", archive.deploymentTarget, EXPECTED.deploymentTarget],
    ];
    for (const [label, actual, expected] of archiveExpectations) {
      if (actual === expected) pass.push(`Archive ${label}=${expected}.`);
      else blockers.push(`Archive ${label} expected ${expected}, found ${actual || "missing"}.`);
    }
    if (archive.codeSignValid) pass.push("Archive codesign verification passed.");
    else blockers.push("Archive codesign verification failed.");
    if (archive.privacyManifestCount >= 3) {
      pass.push(`Archive privacy manifests present (${archive.privacyManifestCount}).`);
    } else {
      blockers.push(`Archive contains ${archive.privacyManifestCount} privacy manifests; expected at least 3.`);
    }
    if (archive.wasmCount > 0 && archive.se1Count > 0) {
      pass.push(`Archive includes WASM (${archive.wasmCount}) and SE1 (${archive.se1Count}).`);
    } else {
      blockers.push("Archive is missing WASM or SE1 calculation assets.");
    }
    if (archive.phase6BGate) pass.push("Archive includes the Phase 6B native feature gate.");
    else blockers.push("Archive is missing the Phase 6B native feature gate.");
    if (!archive.hasNodeModules) pass.push("Archive does not contain node_modules.");
    else blockers.push("Archive unexpectedly contains node_modules.");
  }

  manual.push("Generate and visually inspect the Organizer Privacy Report.");
  manual.push("Run Organizer Validate App only after separate authorization.");

  return {
    expected: EXPECTED,
    status: determineStatus({ blockers, manual }),
    pass,
    blockers,
    manual,
  };
}

function printReport(report) {
  console.log(`iOS App Store distribution readiness: ${report.status}`);
  for (const message of report.pass) console.log(`PASS: ${message}`);
  for (const message of report.blockers) console.log(`BLOCKED: ${message}`);
  for (const message of report.manual) console.log(`MANUAL: ${message}`);
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || null : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = auditDistributionReadiness({ archivePath: argumentValue("--archive") });
  if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  process.exitCode = report.status === "PASS" ? 0 : report.status === "MANUAL" ? 1 : 2;
}
