# Transcript pipeline (Deepgram + OpenAI)

## Vendor choice (Phase 0)

| Tier | Provider | When | Notes |
|------|----------|------|-------|
| 0 | **YouTube transcript worker** (preferred) | `TRANSCRIPT_WORKER_URL` set | Self-hosted Python `youtube-transcript-api` service; most reliable for captioned videos. Source in `worker/youtube-transcript/`. Falls through on 404 (no captions). |
| 1 | YouTube captions (scrape) | Always first | Free, fast; breaks when captions disabled |
| 1b | **youtube-transcript-plus** | After innertube | Free; Innertube caption path (npm), often works when raw timedtext scrape fails |
| 1c | **Invidious mirrors** | After transcript-plus | Free; public Invidious instances (fallback) |
| 1d | **Browser Invidious** (client) | On each fetch/retry | Free; tries Invidious from the user’s browser before the edge function |
| 2 | **AssemblyAI** | `ASSEMBLYAI_API_KEY` + `TRANSCRIPT_TIER2_ENABLED` | Accepts YouTube watch URLs via `audio_url`; utterances + optional speaker labels |
| 3 | **Deepgram** | `DEEPGRAM_API_KEY` + resolved direct audio URL | Watch URLs fail; edge resolves `googlevideo` audio from player/InnerTube, or use `DEEPGRAM_AUDIO_URL` |
| 4 | Gemini video clips | `GEMINI_API_KEY` | Last resort; chunked for long videos |

**Default third-party:** AssemblyAI (production API, no yt-dlp worker in v1).

## Ladder

```
YouTube URL
  → transcript worker (youtube-transcript-api, if TRANSCRIPT_WORKER_URL set)
  → captions (watch / timedtext / InnerTube)
  → AssemblyAI (URL transcribe + poll)
  → Deepgram (audio URL, if available)
  → Gemini clips
  → artifact_transcript_segments + artifacts.raw_text ([M:SS] lines)
  → framework-analyze (OpenAI primary via AI_PROVIDER)
  → framework-embed-transcript (semantic chunks → OpenAI 768d embeddings)
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

**No-caption videos:** at least one of `ASSEMBLYAI_API_KEY` or `DEEPGRAM_API_KEY` plus `GEMINI_API_KEY` for the Gemini fallback. AssemblyAI alone is the most reliable path (watch URL). Deepgram-only works when the resolver finds a direct `googlevideo` stream.

## Storage

- **`artifact_transcript_segments`** — utterance-level rows (source, speaker, timestamps)
- **`artifact_transcript_chunks`** — semantic windows for pgvector search
- **`artifacts.raw_text`** — assembled `[M:SS]` text for legacy UI + analyze

## Search

- RPC: `match_artifact_transcript(query_embedding, artifact_id?, match_count)`
- Edge: `framework-search-transcript` — embeds query server-side, returns chunk hits
- My AI: `match_artifact_transcript` in retrieval context
