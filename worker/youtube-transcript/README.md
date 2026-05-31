# YouTube transcript worker

A tiny Python (FastAPI) service that wraps
[`youtube-transcript-api`](https://github.com/jdepoix/youtube-transcript-api).
It exists because the app's transcript pipeline runs inside Lovable Cloud edge
functions (Deno runtime), which **cannot run Python** and gets rate-limited /
blocked when scraping captions directly from YouTube.

The `framework-fetch-transcript` edge function calls this worker **first**
(preferred tier). If the worker is unreachable or has no captions for a video,
the edge function automatically falls back to its existing tiers
(watch-page captions → AssemblyAI → Deepgram → Gemini).

## Endpoints

| Method | Path          | Description                                   |
|--------|---------------|-----------------------------------------------|
| GET    | `/health`     | Liveness check → `{ "ok": true }`             |
| POST   | `/transcript` | Fetch timed captions for a YouTube video id   |

`POST /transcript` request body:

```json
{ "video_id": "dQw4w9WgXcQ", "languages": ["en", "en-US"] }
```

Response:

```json
{
  "video_id": "dQw4w9WgXcQ",
  "language": "en",
  "segments": [
    { "start": 0.0, "duration": 4.12, "text": "We're no strangers to love" }
  ]
}
```

Status codes: `401` (bad/missing token), `404` (no captions — caller falls
through), `502` (network / IP-block / parse error).

## Environment variables

| Variable         | Required | Purpose                                                        |
|------------------|----------|----------------------------------------------------------------|
| `WORKER_TOKEN`   | yes      | Shared bearer token. Must equal the app's `TRANSCRIPT_WORKER_TOKEN`. |
| `PROXY_USERNAME` | no       | Webshare residential proxy username (recommended in production). |
| `PROXY_PASSWORD` | no       | Webshare residential proxy password.                            |
| `PORT`           | no       | Listen port (most hosts inject this automatically).             |

> **Production tip:** YouTube blocks the shared IPs of most cloud hosts. Set
> `PROXY_USERNAME` / `PROXY_PASSWORD` (a Webshare "Residential" proxy package)
> to keep fetches working at scale. Without a proxy the worker still runs but
> may start returning `502` from YouTube under load.

## Run locally

```bash
cd worker/youtube-transcript
pip install -r requirements.txt
WORKER_TOKEN=dev-secret uvicorn app:app --reload --port 8000

curl -s http://localhost:8000/transcript \
  -H "Authorization: Bearer dev-secret" \
  -H "Content-Type: application/json" \
  -d '{"video_id":"dQw4w9WgXcQ"}' | jq .
```

## Deploy (Render example)

1. Push this repo to GitHub.
2. Render → **New → Web Service** → point it at this repo, root directory
   `worker/youtube-transcript`, environment **Docker** (the `Dockerfile` is
   picked up automatically).
3. Add env var `WORKER_TOKEN` (a long random string). Optionally add the proxy
   vars.
4. Deploy, then note the public URL, e.g. `https://yt-transcript.onrender.com`.

Railway / Fly.io work the same way — any host that builds the `Dockerfile`.

## Connect the app

In Lovable Cloud project secrets set:

- `TRANSCRIPT_WORKER_URL` = the worker base URL (no trailing slash).
- `TRANSCRIPT_WORKER_TOKEN` = the same value as the worker's `WORKER_TOKEN`.

The edge function uses the worker on the next YouTube import automatically.