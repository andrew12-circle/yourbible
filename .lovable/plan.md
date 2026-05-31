# Reliable YouTube transcripts via a Python worker

## Goal

Your app already does the full pipeline (URL → video ID → transcript → Supabase → AI summaries/chapters/claims/scripture → search indexing). The weak link is **transcript fetching**: today it scrapes YouTube captions directly inside a Deno edge function, which YouTube rate-limits and blocks. We'll add a small **self-hosted Python service** running `youtube-transcript-api` and make it the **first, preferred tier** in the existing ladder, so most videos resolve quickly and reliably. All existing fallbacks (AssemblyAI → Deepgram → Gemini) stay as-is.

Python can't run inside Lovable Cloud (Deno-only edge runtime), so the worker is a separate tiny service you deploy once (Render/Railway/Fly/any host). The edge function calls it over HTTPS with a shared secret.

## New transcript ladder

```text
YouTube URL
  → Python worker (youtube-transcript-api)   ← NEW, preferred
  → watch-page captions / timedtext / innertube  (existing)
  → AssemblyAI                                    (existing)
  → Deepgram                                      (existing)
  → Gemini video clips                            (existing)
  → store in Supabase → framework-analyze → framework-embed-transcript
```

If the worker isn't configured (no secret), behavior is identical to today.

## Part 1 — The Python worker (new, deployed separately)

Add worker source to the repo under `worker/youtube-transcript/` (stored for deployment only; it is **not** part of the React/Deno build):

- `app.py` — FastAPI app exposing:
  - `GET /health` → `{ ok: true }`
  - `POST /transcript` body `{ "video_id": "...", "languages": ["en"] }` → returns timed segments:
    ```json
    { "video_id": "...", "language": "en", "segments": [ { "start": 12.3, "duration": 4.1, "text": "..." } ] }
    ```
  - Auth via `Authorization: Bearer <WORKER_TOKEN>` (env var on the worker); reject otherwise with 401.
  - Uses `YouTubeTranscriptApi.get_transcript(video_id, languages=[...])` with graceful handling of `TranscriptsDisabled` / `NoTranscriptFound` (returns 404 so the edge function falls through to the next tier).
  - Optional Webshare/residential **proxy support** (`WebshareProxyConfig`) via env vars, since cloud-host IPs themselves can be blocked by YouTube — documented as the recommended production setting.
- `requirements.txt` — `fastapi`, `uvicorn[standard]`, `youtube-transcript-api`.
- `Dockerfile` — slim Python image running `uvicorn app:app`.
- `README.md` — deploy steps (Render/Railway one-click style), env vars (`WORKER_TOKEN`, optional proxy creds), and a curl test.

## Part 2 — Edge function integration (this project)

1. **Secrets** (added via the secrets flow, you'll paste values):
   - `TRANSCRIPT_WORKER_URL` — the deployed worker base URL.
   - `TRANSCRIPT_WORKER_TOKEN` — shared bearer token (must match the worker's `WORKER_TOKEN`).

2. **New provider** `supabase/functions/_shared/transcriptProviders/youtubeTranscriptWorker.ts`:
   - `fetchWorkerTranscript(videoId)` POSTs to `${TRANSCRIPT_WORKER_URL}/transcript` with the bearer token.
   - Maps each `{start, duration, text}` → `TranscriptSegmentRow` (`start_seconds = floor(start)`, `end_seconds = ceil(start+duration)`, `source: "third_party"`), then returns `buildFetchResult(segments, "third_party", "youtube_transcript_worker")` — same shape as the Deepgram/AssemblyAI providers, so persistence and downstream steps are unchanged.
   - Throws on missing config / 401 / 404 / empty so the ladder cleanly falls through.

3. **Wire into the ladder** in `framework-fetch-transcript/index.ts` (`transcribeYouTubeVideo`): attempt the worker **first** when `TRANSCRIPT_WORKER_URL` is set, recording a `tierAttempts` entry on failure, then continue into the existing caption/AssemblyAI/Deepgram/Gemini path untouched. Metadata (title, channel, duration, chapters) still comes from the existing `getYouTubeMetadata` / caption-bundle logic.

4. No DB or frontend changes: transcripts persist through the existing `persistTranscriptSegments` / `persistTranscriptChunks`, and `framework-analyze` + `framework-embed-transcript` already fire afterward. `"third_party"` is already a valid `TranscriptSegmentSource`.

## Part 3 — Docs

Update `docs/transcript-pipeline.md`: add the worker as Tier 0 (preferred), document the two new secrets, and link the worker README.

## Verification

- Deploy the worker, set the two secrets.
- Use the migration-free path: call `framework-fetch-transcript` via the edge-function test tool with a known captioned video and confirm `metadata.transcript_provider` (or provider in logs) = `youtube_transcript_worker` and segments persist.
- Confirm a captions-disabled video still falls through to the existing tiers.
- Run `npm run lint`, `npm run test`, `npm run build`.

## Technical notes / caveats

- `youtube-transcript-api` only returns **existing** captions (manual or auto). For videos with no captions at all, the worker returns 404 and the ladder falls back to AssemblyAI/Deepgram/Gemini exactly as today — so reliability improves without losing coverage.
- Cloud-host IP blocking by YouTube is the main real-world failure mode; the worker's optional proxy config is the production-recommended mitigation and is documented but off by default.
- The worker source lives in `worker/` purely as deployable artifact; it is excluded from the app build and has no effect on the Vite/Deno bundles.
