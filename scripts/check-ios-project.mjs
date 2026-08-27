import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function readRequired(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    errors.push(`${relativePath}: required file is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requireMatch(text, pattern, message) {
  if (!pattern.test(text)) errors.push(message);
}

function plistHasNonemptyString(plist, key) {
  const pattern = new RegExp(
    `<key>\\s*${key}\\s*</key>\\s*<string>\\s*[^<\\s][^<]*</string>`,
  );
  return pattern.test(plist);
}

function collectFiles(directory, extension) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [entryPath] : [];
  });
}

const capacitorConfig = readRequired("capacitor.config.ts");
const infoPlist = readRequired("ios/App/App/Info.plist");
const pluginSource = readRequired("ios/App/App/HolyParkNativePlugin.swift");
const journalVideoPluginSource = readRequired("ios/App/App/JournalVideoRecorderPlugin.swift");
const sceneDelegateSource = readRequired("ios/App/App/SceneDelegate.swift");
const projectFile = readRequired("ios/App/App.xcodeproj/project.pbxproj");
const packageFile = readRequired("ios/App/CapApp-SPM/Package.swift");

requireMatch(
  capacitorConfig,
  /appId:\s*["']com\.holypark\.architecture["']/,
  "capacitor.config.ts: expected appId com.holypark.architecture",
);
requireMatch(
  capacitorConfig,
  /webDir:\s*["']dist["']/,
  "capacitor.config.ts: expected webDir dist",
);

for (const privacyKey of ["NSCameraUsageDescription", "NSMicrophoneUsageDescription"]) {
  if (!plistHasNonemptyString(infoPlist, privacyKey)) {
    errors.push(`ios/App/App/Info.plist: ${privacyKey} must have a non-empty description`);
  }
}

requireMatch(
  pluginSource,
  /@objc\(HolyParkNativePlugin\)/,
  "HolyParkNativePlugin.swift: Objective-C plugin identity is missing",
);
requireMatch(
  pluginSource,
  /jsName\s*=\s*["']HolyParkNative["']/,
  "HolyParkNativePlugin.swift: JavaScript plugin name must be HolyParkNative",
);
requireMatch(
  pluginSource,
  /registerPluginInstance\(HolyParkNativePlugin\(\)\)/,
  "HolyParkNativePlugin.swift: plugin instance is not registered with the Capacitor bridge",
);
requireMatch(
  projectFile,
  /HolyParkNativePlugin\.swift in Sources/,
  "project.pbxproj: HolyParkNativePlugin.swift is not in the app Sources build phase",
);
requireMatch(
  journalVideoPluginSource,
  /@objc\(JournalVideoRecorderPlugin\)/,
  "JournalVideoRecorderPlugin.swift: Objective-C plugin identity is missing",
);
requireMatch(
  journalVideoPluginSource,
  /jsName\s*=\s*["']JournalVideoRecorder["']/,
  "JournalVideoRecorderPlugin.swift: JavaScript plugin name must be JournalVideoRecorder",
);
requireMatch(
  journalVideoPluginSource,
  /registerPluginInstance\(JournalVideoRecorderPlugin\(\)\)/,
  "JournalVideoRecorderPlugin.swift: recorder plugin is not registered with the Capacitor bridge",
);
requireMatch(
  sceneDelegateSource,
  /rootViewController\s*=\s*HolyParkAppBridgeViewController\(\)/,
  "SceneDelegate.swift: the root bridge does not register the journal video plugin",
);
requireMatch(
  projectFile,
  /JournalVideoRecorderPlugin\.swift in Sources/,
  "project.pbxproj: JournalVideoRecorderPlugin.swift is not in the app Sources build phase",
);

const swiftSourceFiles = collectFiles(resolve(repositoryRoot, "ios/App/App"), ".swift");
for (const sourcePath of swiftSourceFiles) {
  const sourceName = basename(sourcePath);
  if (!projectFile.includes(`${sourceName} in Sources`)) {
    const displayedPath = relative(repositoryRoot, sourcePath).replaceAll("\\", "/");
    errors.push(`project.pbxproj: ${displayedPath} is not in the app Sources build phase`);
  }
}

const deploymentTargets = [...projectFile.matchAll(/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*([0-9.]+);/g)].map(
  ([, version]) => Number.parseFloat(version),
);
if (deploymentTargets.length === 0) {
  errors.push("project.pbxproj: no iOS deployment target was found");
} else if (deploymentTargets.some((version) => !Number.isFinite(version) || version < 15)) {
  errors.push("project.pbxproj: every iOS deployment target must be iOS 15.0 or newer");
}

const swiftVersions = [...projectFile.matchAll(/SWIFT_VERSION\s*=\s*([0-9.]+);/g)].map(
  ([, version]) => Number.parseFloat(version),
);
if (swiftVersions.length === 0) {
  errors.push("project.pbxproj: no Swift language version was found");
} else if (swiftVersions.some((version) => !Number.isFinite(version) || version < 5)) {
  errors.push("project.pbxproj: Swift 5.0 or newer is required");
}

requireMatch(
  packageFile,
  /platforms:\s*\[\.iOS\(\.v15\)\]/,
  "CapApp-SPM/Package.swift: expected an iOS 15 package platform floor",
);

if (/<key>\s*UIBackgroundModes\s*<\/key>[\s\S]*?<string>\s*audio\s*<\/string>/.test(infoPlist)) {
  warnings.push(
    "Info.plist declares audio background mode; this does not permit camera capture in the background",
  );
}
if (!/productType\s*=\s*"com\.apple\.product-type\.bundle\.(?:unit-test|ui-testing)"/.test(projectFile)) {
  warnings.push("project.pbxproj has no iOS unit-test or UI-test target");
}
const allSwiftSource = swiftSourceFiles.map((sourcePath) => readFileSync(sourcePath, "utf8")).join("\n");
if (!/AVCaptureSession|AVCaptureMovieFileOutput/.test(allSwiftSource)) {
  warnings.push("the iOS app sources do not yet contain an AVFoundation capture session");
}
if (!existsSync(resolve(repositoryRoot, "ios/App/App/PrivacyInfo.xcprivacy"))) {
  warnings.push("ios/App/App/PrivacyInfo.xcprivacy is absent; confirm required-reason API declarations");
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

console.log(
  `Static iOS project validation: ${errors.length} error(s), ${warnings.length} warning(s).`,
);
console.log(
  "This check does not compile Swift, sign an archive, run AVFoundation, or replace physical-iPhone testing.",
);

if (errors.length > 0) process.exitCode = 1;
