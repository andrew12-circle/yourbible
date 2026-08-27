# iPhone mobile build audit

Audit date: 2026-08-27

Source baseline: `3b0b0c1f820315e6bc76362733206cdc8058e297`

Primary device target: modern iPhone portrait, with iPhone landscape tracked separately

This ledger covers every declared route family plus the Capacitor/iOS shell. "Source fixed" means the implementation and automated checks are present in this repository. It does not mean an Xcode archive, TestFlight build, or physical iPhone has been verified.

## High-impact fixes in this overhaul

- Native Capacitor launches always use the iOS launcher/mobile shell, independent of the saved desktop Hub preference.
- Journal and Video journal are prioritized on the first launcher page; widget pages scroll vertically instead of clipping.
- Native status-bar contrast follows route/modal surfaces, keyboard-open state reaches React without double-lifting native-resized docks, and splash/CSS safe areas follow one edge-to-edge contract.
- The OS app icon is full bleed, and the stock Capacitor launch art is replaced by light/dark branded splash assets generated from the same orange-cross master.
- Native WebView startup hides the splash after React paints, suppresses web service-worker update prompts, hides imitation OS chrome, and removes the desktop floating-journal window from native iPhone.
- Journal cover sizing now recognizes a real iPhone, not only the simulated mini-phone.
- Journal landing exposes Video, Write, and Dictate before search and history.
- Compose reserves the measured dock height, does not auto-open a location map, and labels speech-to-text accurately as Dictate.
- Entry reading shows the title once, displays only the saved entry location inline, and no longer geolocates the reader.
- Journal Media now includes lightweight video tiles without opening hundreds of media resources; stored portrait video uses portrait geometry and skips expensive whole-file repair for native MOV/MP4.
- AVFoundation drafts surface in a persistent, tuckable recovery card, refresh immediately after save/discard, and deep-link to the exact owning entry or Life Week flow for Resume/Review. A new Video Journal now opens the native recorder before any network request; once an entry exists, a durable local owner-to-entry receipt preserves exact recovery across a process restart.
- Native capture has one close button and remains full-screen across iPhone portrait and landscape widths.
- Mobile Notes preserves its notebook context and routes note taps directly into the established phone editor instead of desktop panes.
- Life Week video close-out now attaches only the explicitly confirmed take, makes the journal entry and upload-queue receipt durable before marking the week complete, and can reopen the exact retained native week capture even after dismissal or close-out.
- Shared dialogs/sheets have safe viewport bounds and 44px close targets; phone text fields remain 16px to prevent iOS focus zoom.

## Route and screen coverage

| Route family | Current iPhone status | Remaining work |
| --- | --- | --- |
| `/`, `/auth`, `/auth/reset`, `/privacy`, `/terms`, `/onboarding`, `/partner/accept` | Usable; onboarding already owns safe areas. | Auth remains a tall web-oriented first screen. Add compact signed-build visual QA and password-manager/social-login device tests. |
| `/home` | Source fixed: native launcher is mandatory, Journal/Video journal are page-one actions, widget page scrolls, fake status/home indicators are suppressed. | Persist user icon/dock ordering and consider bespoke art for secondary apps after the canonical product name is chosen. |
| `/settings` | Source fixed: mobile navigation and its 44px Home action remain active through iPhone landscape; inputs no longer shrink below 16px. | Run every secondary settings section with landscape, large text, and the keyboard on a signed build. |
| `/journal`, journal list/calendar/map/graph/life/mirror/prompts/today/vent | Source fixed for cover scale, safe-area ownership, 44px primary controls, sticky headers, and journal-first quick actions. | Audit every secondary rail/calendar action with VoiceOver and larger text. |
| `/journal/new`, `/journal/:id/edit` | Source fixed for measured toolbar clearance, opt-in map, visible Dictate state, network-independent native video launch, route-safe autosave, keyboard plugin, and exact-owner recovery deep link. | Speech dictation is transcription only. A durable audio attachment needs a separate AVAudioRecorder implementation. |
| Native video capture/review/upload recovery | AVFoundation source, interruption state, durable native file, upload queue, abortable materialization, Keep for later, global recovery card, and owner-aware handoff are present. | Physical call/background/force-close/offline/low-storage/rotation ledger remains mandatory. |
| `/journal/:id` | Source fixed: no duplicate title, no current-location lookup, optional saved map is inline, and portrait video is preserved. | Run long-entry, many-video, and low-memory playback on device. |
| `/journal/media` | Source fixed: unified photo/video grid, stale-request guard, surfaced load errors, bounded ID batches, and zero eager video decoders. | Add generated poster frames for richer video tiles. |
| `/journal/notes` | Source fixed: mobile preserves Notes scope and opens the normal phone editor; desktop keeps the desk editor. | A more specialized Notes toolbar can be added later without shipping desktop panes on phone. |
| `/read/*`, `/bible/life-guide`, `/bible/code-lab`, `/reading-plans` | Strong mobile baseline with dedicated reader chrome and dock. | Some chapter/settings targets remain near 40px. Split `ReaderPage.tsx` before broad changes; it is close to the 2,000-line cap. |
| `/framework*`, artifacts, research, hard questions, questions for God | Artifact mobile panels have meaningful tests and compact layouts. | Framework breakpoint branches can form landscape hybrids. Split `ArtifactDetailPage.tsx` before broad changes; it is close to the line cap. |
| `/my-ai`, `/my-ai/:chatId` | Strong baseline: mobile sheet, keyboard-aware composer, safe header. | Normalize remaining 36–40px header actions and physical keyboard/voice QA. |
| `/life-weeks`, `/life/week-reviews` | Source fixed: only the confirmed video take attaches, close-out queues journal media before the week closes, deterministic tags keep retries idempotent, and exact native-owner links can force the relevant review back open. | Verify retry and retained-source cleanup under physical offline/force-close conditions. |
| `/life/priorities`, `/life/habits`, `/life/todos`, `/life/vision-board` | Priorities/Habits/Tasks headers own notch clearance; Tasks stays compact through iPhone landscape; Vision Board is already mobile-aware. | Priorities still uses a wide 30-day table. Create a phone-native summary before the table. |
| `/prayer*` | Source fixed for notch clearance and 44px back/tab targets. | Migrate fully to `MobilePageShell` and run larger-text/long-label screenshots. |
| `/living-hope*`, `/sleep` | Strong baseline with full-height chrome and safe areas. | Physical audio/background and sleep-screen interruption QA. |
| `/children-books*` | Source fixed: library has safe-area/Home chrome; compact reader controls are visible, safe-area positioned, and 44px. | Verify Pencil/illustration sheets and landscape page turns on device. |
| `/partner` | Source fixed for safe top spacing and a 44px Home action. | Run long-name/content QA. |
| `/music` | Source fixed for notch clearance, a 44px Home control, and 44px playback controls. | Verify background audio routing, interruptions, and docked YouTube behavior on iPhone. |

## Still-open product decisions

1. Choose one App Store/product name. Native currently says **Holy Park Architecture**, while parts of the web experience say **Belief Architecture** or **YourBible**. Do not ship App Store metadata until the name, permission copy, manifest, and in-app identity agree.
2. Decide whether iPhone landscape is a supported first-class layout for the first release. The recorder now remains full-screen, but Settings, Framework, Todos, and secondary tools still need landscape-specific QA. If that work is deferred, portrait-lock the iPhone target intentionally rather than shipping hybrid layouts accidentally.
3. Decide whether "audio journal" means speech-to-text or a retained audio attachment. The current action is now honestly labeled Dictate. Retained audio needs AVAudioRecorder, native interruption recovery, durable file handoff, upload queueing, and playback/media integration.

## Native release evidence matrix

| Layer | Required evidence |
| --- | --- |
| Source | TypeScript, lint, tests, web build, file-size gate, static iOS validation. |
| Native project | `npm run sync:ios`, Swift Package resolution, clean Xcode compile, no duplicate bridge/root controller. The wrapper repairs Windows path separators that are invalid inside Swift strings. |
| Signed distribution | Archive with the intended bundle ID, icon, display name, permission descriptions, entitlements, and version. |
| TestFlight | Cold launch, update install, offline launch, background/foreground, memory pressure, and account sign-in. |
| Physical iPhone behavior | The checklist below, recorded by device/build/OS with Pass/Fail/Notes. |

## Physical iPhone acceptance checklist

- [ ] Tap the OS app icon from a cold launch: branded splash appears, then `/home` launcher without a dashboard flash.
- [ ] Journal and Video journal are visible on the first launcher page and every icon has a reliable 44pt target.
- [ ] Start a native video, pause it, accept/decline a phone call, return, and resume without loss.
- [ ] Start a native video, background the app, use another app for several minutes, return, and resume.
- [ ] Force-close during recording, relaunch, see the recovery card, and resume the exact owning entry.
- [ ] Force-close after recording but before upload, relaunch, review the retained file, and complete upload once.
- [ ] Record offline, restore connectivity, and confirm one idempotent video row/object with no duplicates.
- [ ] Rotate during preview, recording, pause, review, and upload; verify controls remain reachable.
- [ ] Record portrait and landscape clips; verify Media and entry playback retain the correct geometry.
- [ ] Open the compose keyboard, dictate, switch fields, dismiss, and confirm no dock/editor overlap or white accessory slab.
- [ ] Test Bluetooth/AirPods route changes, microphone denial, camera denial, low storage, and low-memory warnings.
- [ ] Test light/dark appearance, Dynamic Island/notch devices, Home indicator spacing, larger text, and VoiceOver.
- [ ] Complete a Life Week with video and confirm the week and journal entry cannot diverge after a failure.

Do not mark the iPhone build physically verified until every required row has a named build, device, iOS version, result, and notes.
