# iOS native validation

The Capacitor iOS project lives in `ios/App`. Its journal-video path uses AVFoundation through the
separately registered `JournalVideoRecorder` plugin; `HolyParkNative` remains the general native
bridge. This checklist separates checks that are honest on Windows from the compile, signing, and
device evidence that only Xcode can provide.

## Cross-platform structural checks

From the repository root:

```sh
npm run check:ios-project
npm run test -- src/lib/journal/videos.test.ts
npm run lint
npm run build
```

`check:ios-project` reads source configuration only. It checks the Capacitor identity, privacy usage
descriptions, plugin registration and Xcode source membership, deployment target, Swift version, and
Swift Package iOS floor. Warnings identify release evidence that source inspection cannot supply.

Passing these commands on Windows does **not** compile Swift, resolve an Xcode build, run AVFoundation,
provision an iPhone, validate entitlements, sign an archive, or prove camera/microphone interruption
behavior. In particular, the `audio` background mode does not allow camera capture to continue while
the app is backgrounded.

## macOS and Xcode gates

Use the repository-supported Node version, current dependencies, and a compatible Xcode installation:

```sh
npm ci
npm run build
npx cap sync ios
npm run check:ios-project
xcodebuild -list -project ios/App/App.xcodeproj
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

The simulator build is useful compile evidence but cannot prove real camera capture, call interruption,
background behavior, route changes, or durable recovery. Before release:

1. Open `ios/App/App.xcodeproj` in Xcode and select the intended signing team and bundle identifier.
2. Build and run on a physical iPhone whose iOS version is at or above the project deployment target.
3. Complete the native rows in the manual device ledger in
   [`journal-video-reliability.md`](./journal-video-reliability.md).
4. Run any iOS unit/UI test targets in Xcode. If the project has no test target, add one before treating
   native recorder behavior as automated.
5. Create an Archive, validate it in Organizer, and retain the Xcode build log plus the device/model,
   iOS version, app version, build number, and test date as release evidence.

The upload contract must preserve the captured container: AVFoundation QuickTime output is sent as
`video/quicktime` with a `.mov` object name, while MP4 output remains `.mp4`. A successful upload is not
the durability boundary; the native file remains until JavaScript acknowledges that the user-scoped
durable upload queue has committed the Blob.
