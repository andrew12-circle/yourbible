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
const journalVideoSessionSource = readRequired(
  "ios/App/App/JournalVideo/JournalVideoCaptureSession.swift",
);
const journalVideoControllerSource = readRequired(
  "ios/App/App/JournalVideo/JournalVideoRecorderViewController.swift",
);
const journalVideoModelsSource = readRequired(
  "ios/App/App/JournalVideo/JournalVideoCaptureModels.swift",
);
const journalVideoCoordinatorSource = readRequired(
  "ios/App/App/JournalVideo/JournalVideoCaptureCoordinator.swift",
);
const nativeJournalDialogSource = readRequired(
  "src/components/journal/NativeJournalVideoCaptureDialog.tsx",
);
const sceneDelegateSource = readRequired("ios/App/App/SceneDelegate.swift");
const mainStoryboard = readRequired("ios/App/App/Base.lproj/Main.storyboard");
const projectFile = readRequired("ios/App/App.xcodeproj/project.pbxproj");
const packageFile = readRequired("ios/App/CapApp-SPM/Package.swift");
const appIconCatalog = readRequired("ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json");
const splashCatalog = readRequired("ios/App/App/Assets.xcassets/Splash.imageset/Contents.json");
const nativeKeyboardSource = readRequired("src/lib/native/nativeKeyboard.ts");

requireMatch(
  capacitorConfig,
  /appId:\s*["']com\.holypark\.architecture["']/,
  "capacitor.config.ts: expected appId com.holypark.architecture",
);
if (/Keyboard\.setScroll\(\{\s*isDisabled:\s*true/.test(nativeKeyboardSource)) {
  errors.push(
    "nativeKeyboard.ts: globally disabling WKWebView scrolling strands document-scroll routes",
  );
}
requireMatch(
  capacitorConfig,
  /webDir:\s*["']dist["']/,
  "capacitor.config.ts: expected webDir dist",
);
requireMatch(
  capacitorConfig,
  /contentInset:\s*["']never["']/,
  "capacitor.config.ts: CSS safe areas require iOS contentInset never",
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
  `${pluginSource}\n${journalVideoPluginSource}`,
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
  mainStoryboard,
  /customClass=["']HolyParkAppBridgeViewController["']/,
  "Main.storyboard: expected the plugin-registering HolyParkAppBridgeViewController root",
);
requireMatch(
  projectFile,
  /JournalVideoRecorderPlugin\.swift in Sources/,
  "project.pbxproj: JournalVideoRecorderPlugin.swift is not in the app Sources build phase",
);
requireMatch(
  journalVideoSessionSource,
  /resumeAfterSystemInterruption[\s\S]*restoreCaptureAfterSystemInterruptionOnQueue/,
  "JournalVideoCaptureSession.swift: foreground restoration must retain active recording intent",
);
requireMatch(
  journalVideoSessionSource,
  /stopIntent\s*=\s*\.interrupt[\s\S]*requestPauseOnQueue[\s\S]*didStartRecordingTo[\s\S]*interruptionInFlight[\s\S]*stopRecording\(\)/,
  "JournalVideoCaptureSession.swift: start/background races must stop and preserve the pending fragment",
);
requireMatch(
  journalVideoSessionSource,
  /try applyRecordingOrientation\(from: manifest\)[\s\S]*allocateActivePart/,
  "JournalVideoCaptureSession.swift: recording geometry must persist before allocating a fragment",
);
requireMatch(
  journalVideoSessionSource,
  /captureSession\.isInterrupted[\s\S]*scheduleRestoreRetry\(\)/,
  "JournalVideoCaptureSession.swift: foreground restore must tolerate transient camera return failures",
);
requireMatch(
  journalVideoSessionSource,
  /AVAudioSession[\s\S]*setActive\(true\)/,
  "JournalVideoCaptureSession.swift: interrupted recordings must reactivate the audio session",
);
requireMatch(
  journalVideoSessionSource,
  /manifest\.parts\.isEmpty[\s\S]*AVCaptureDevice\.RotationCoordinator[\s\S]*videoRotationAngleForHorizonLevelCapture/,
  "JournalVideoCaptureSession.swift: iOS 17 capture rotation coordination is missing",
);
requireMatch(
  journalVideoControllerSource,
  /previewRotationDegrees[\s\S]*videoRotationAngle/,
  "JournalVideoRecorderViewController.swift: preview must restore persisted native rotation",
);
requireMatch(
  journalVideoModelsSource,
  /captureRotationDegrees[\s\S]*previewRotationDegrees[\s\S]*cameraPosition/,
  "JournalVideoCaptureModels.swift: native camera geometry is not persisted",
);
requireMatch(
  journalVideoCoordinatorSource,
  /attachPreviewLayer\(controller\.capturePreviewLayer\)/,
  "JournalVideoCaptureCoordinator.swift: the rotation coordinator is detached from its preview layer",
);
requireMatch(
  nativeJournalDialogSource,
  /appStateChange[\s\S]*resumeNativeJournalVideoCapture\(sessionId\)/,
  "NativeJournalVideoCaptureDialog.tsx: foreground must reattach the exact native session",
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
if (/path:\s*["'][^"']*\\[^"']*["']/.test(packageFile)) {
  errors.push(
    "CapApp-SPM/Package.swift: plugin paths contain Windows separators; normalize them to forward slashes after Capacitor sync",
  );
}
for (const plugin of ["CapacitorKeyboard", "CapacitorSplashScreen", "CapacitorStatusBar"]) {
  requireMatch(
    packageFile,
    new RegExp(`\\.product\\(name:\\s*["']${plugin}["']`),
    `CapApp-SPM/Package.swift: ${plugin} is not linked into the native app`,
  );
}
requireMatch(
  appIconCatalog,
  /AppIcon-512@2x\.png/,
  "AppIcon.appiconset: the universal 1024 app icon is missing",
);
requireMatch(
  splashCatalog,
  /Default@3x~universal~anyany\.png/,
  "Splash.imageset: the branded launch asset is missing",
);
for (const asset of [
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  "ios/App/App/Assets.xcassets/Splash.imageset/Default@3x~universal~anyany.png",
  "ios/App/App/Assets.xcassets/Splash.imageset/Default@3x~universal~anyany-dark.png",
]) {
  if (!existsSync(resolve(repositoryRoot, asset))) errors.push(`${asset}: required asset is missing`);
}

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
