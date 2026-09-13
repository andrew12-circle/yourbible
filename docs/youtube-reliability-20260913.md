# YouTube playback and transcript repair

## Playback

Local Capacitor documents use an HTTPS player document on the existing application host, so the nested YouTube iframe has a genuine HTTP Referer. Normal web embeds remain direct; Error 153 triggers a single same-video recovery through the hosted document, preserving the observed playhead. Other errors, including embedding restrictions, are not bypassed. Parent/frame messages require both the expected origin and exact Window source; only playback/seek/telemetry commands are relayed. The one HTML player route is frameable by self and native localhost origins; application pages retain X-Frame-Options DENY.

The native fallback host is https://yourbible-lodge.vercel.app, optionally set with VITE_YOUTUBE_HOST_ORIGIN. Actual HTTPS web origins use their own host. Auth tokens and URL queries are not sent as widget_referrer. Native builds with bundled web assets must be rebuilt to receive the frontend change; publishing Vercel does not update an already-installed TestFlight binary.

## Transcript retrieval

The existing Vercel deployment now provides an authenticated POST /api/youtube-captions Node function. It uses the same existing Supabase project URL/public key environment variables to validate the user's token; no new paid transcription provider or service-role key is required. It accepts only a video ID, bounds execution, validates cues, and never returns guessed transcript text on failure. Its local burst limiter is per instance, not a distributed quota. The edge caller defaults to the existing app domain and can be configured with YOUTUBE_CAPTION_APP_ORIGIN.

Both Supabase caption entry points try this route independently of the optional external worker. Edge youtube-transcript-plus is pinned to 2.0.0, matching the frontend. Captions remain dependent on upstream availability; this is not a guarantee for every YouTube video. No playback restrictions, login walls, or private videos are bypassed.

YouTube watch-page HTML is not submitted as an audio file to AssemblyAI/Deepgram. Missing direct audio returns an explicit unavailable result. Gemini billing exhaustion is not retried as transient throttling. The job deadline fits within an edge worker lifetime, and deadline timers are cleared. Polling no longer creates duplicate paid jobs. Error writes are scoped to the original processing token; a late old failure cannot replace a newer retry's status. Captions received are saved before optional AI chapter generation; failed optional work cannot erase that text.

The UI distinguishes depleted provider credit from temporary rate limits, exposes recovery for stalled transcript jobs, and only displays “Watching for new claims” when there is actual text being analyzed.

## Operational limits

The observed Gemini project returned depleted-prepayment HTTP 429. Code does not replenish that balance. Automatic audio transcription and downstream AI analysis using that key remain blocked until billing is restored. The optional separate TRANSCRIPT_WORKER_URL remains unconfigured; the new existing-host caption path does not require it. The installed iPhone/camera environment has not been physically tested.

## Checks

Regression coverage includes native/web embed identity, strict message source checks, one-time Error 153 recovery, preserved player identity across layout changes, runtime bridge commands, rejected watch URLs, billing retry classification, deadline cleanup, authenticated caption retrieval, malformed/empty cue responses, and stalled/error UI.

Run npm test, npm run lint, npm run build, node scripts/check-youtube-edge.mjs, and the repository's type-regression comparison. Existing unrelated TypeScript diagnostics must be reported rather than hidden. An optional public-video caption probe records availability from CI; it is not an authenticated production or physical-device test.
