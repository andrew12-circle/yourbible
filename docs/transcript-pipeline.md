# Transcript pipeline (Deepgram + OpenAI)

## Vendor choice (Phase 0)

| Tier | Provider | When | Notes |
|------|----------|------|-------|
| −1 | **Global cache** | Same `video_id` fetched before | `youtube_transcript_cache` table; 90-day TTL |
| 0 | **Parallel caption race** (~4.5s) | Always (unless cache hit) | OAuth + worker + watch + timedtext + innertube + transcript-plus + invidious run **in parallel**; first win |
| 0a | **YouTube OAuth captions** | User connected in Settings | Official `captions.download` for videos on the user’s channel |
| 0b | **Transcript worker** | `TRANSCRIPT_WORKER_URL` set | Self-hosted Python `youtube-transcript-api`; use Webshare proxy in production |
| 1 | **Browser prefetch** (client) | On URL paste / submit | `youtube-transcript-plus` + Invidious from the user’s IP before edge runs |
| 2 | **AssemblyAI** | `ASSEMBLYAI_API_KEY` + `TRANSCRIPT_TIER2_ENABLED` | Starts right after caption race misses; accepts YouTube watch URLs |
| 3 | **Deepgram** | `DEEPGRAM_API_KEY` + resolved direct audio URL | Watch URLs fail; edge resolves `googlevideo` when possible |
| 4 | Gemini video clips | `GEMINI_API_KEY` | Last resort; chunked for long videos |

**Default third-party:** AssemblyAI (production API, no yt-dlp worker in v1).

## Ladder

```
YouTube URL
  → browser prefetch on paste (client)
  → cache lookup by video_id
  → parallel caption race (OAuth / worker / scrape tiers)
  → AssemblyAI (if race misses)
  → Deepgram → Gemini
  → cache write + artifact_transcript_segments + artifacts.raw_text
  → framework-analyze → framework-embed-transcript
```

## YouTube transcript worker (Tier 0)

`youtube-transcript-api` is a Python library and cannot run inside the Deno edge
runtime, so it is deployed as a small standalone service. Source, Dockerfile and
deploy steps live in [`worker/youtube-transcript/README.md`](../worker/youtube-transcript/README.md).

When `TRANSCRIPT_WORKER_URL` is set, `framework-fetch-transcript` calls the
worker first; if the worker is unreachable or the video has no captions, the
pipeline falls through to the existing caption/AssemblyAI/Deepgram/Gemini tiers.

| Variable | Purpose |
|----------|---------|
| `TRANSCRIPT_WORKER_URL` | Base URL of the deployed worker (no trailing slash) |
| `TRANSCRIPT_WORKER_TOKEN` | Bearer token; must match the worker's `WORKER_TOKEN` |

## Live stream capture MVP

The app now exposes `/framework/artifacts/live` as the artifact-library surface for a live YouTube workspace:

```
YouTube live URL
  → iframe embed
  → operator / external STT transcript chunks
  → local signal detector for lifted claims
  → artifacts.raw_text + artifact_claims
  → artifact detail review, journal work, belief comparison
```

This is intentionally the UI-first MVP. Production live transcription should add a worker that pulls audio with `yt-dlp`
and `ffmpeg`, streams it to Deepgram over WebSocket, then appends transcript chunks into the same artifact session.
The current browser surface already preserves the data contract for that worker through `metadata.live_capture`.

## Environment

Set secrets on the Supabase project (local `.env` is not injected into deployed functions):

```bash
npx supabase secrets set \
  GEMINI_API_KEY=... \
  DEEPGRAM_API_KEY=... \
  ASSEMBLYAI_API_KEY=... \
  --project-ref YOUR_REF
npx supabase functions deploy framework-fetch-transcript --project-ref YOUR_REF
```

| Variable | Purpose |
|----------|---------|
| `AI_PROVIDER` | `openai` (default when key present) or `gemini` |
| `OPENAI_API_KEY` | Analyze + embeddings |
| `ASSEMBLYAI_API_KEY` | **Recommended** tier-2 — accepts YouTube watch URLs when captions are missing |
| `DEEPGRAM_API_KEY` | Tier-3 — needs a direct audio URL (auto-resolved when possible) |
| `DEEPGRAM_AUDIO_URL` | Optional override when auto-resolve fails |
| `TRANSCRIPT_TIER2_ENABLED` | `false` to skip AssemblyAI even when key is set |
| `GEMINI_API_KEY` | Required for tier-4 chunked STT + optional chapter generation |
| `YOUTUBE_DATA_API_KEY` | Metadata / description chapters |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | YouTube OAuth (Settings → Connect YouTube) |
| `YOUTUBE_OAUTH_APP_ORIGIN` | Where to redirect after OAuth (e.g. production app URL) |
| `TRANSCRIPT_CAPTION_RACE_MS` | Parallel caption timeout (default `4500`) |

**No-caption videos:** at least one of `ASSEMBLYAI_API_KEY` or `DEEPGRAM_API_KEY` plus `GEMINI_API_KEY` for the Gemini fallback. AssemblyAI alone is the most reliable path (watch URL). Deepgram-only works when the resolver finds a direct `googlevideo` stream.

## Storage

- **`artifact_transcript_segments`** — utterance-level rows (source, speaker, timestamps)
- **`artifact_transcript_chunks`** — semantic windows for pgvector search
- **`artifacts.raw_text`** — assembled `[M:SS]` text for legacy UI + analyze

## Search

- RPC: `match_artifact_transcript(query_embedding, artifact_id?, match_count)`
- Edge: `framework-search-transcript` — embeds query server-side, returns chunk hits
- My AI: `match_artifact_transcript` in retrieval context
