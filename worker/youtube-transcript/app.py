"""
YouTube transcript worker.

A tiny FastAPI service that wraps `youtube-transcript-api` so the Lovable Cloud
(Deno) edge function `framework-fetch-transcript` can fetch YouTube captions
reliably from a server that can carry a proper IP / proxy.

Auth: every request must send `Authorization: Bearer <WORKER_TOKEN>` where
WORKER_TOKEN matches the env var configured on this service.

Endpoints:
  GET  /health      -> {"ok": true}
  POST /transcript  -> {"video_id", "language", "segments": [{start, duration, text}]}

Behaviour:
  - 401 when the bearer token is missing/wrong.
  - 404 when captions are disabled / unavailable (the edge function then falls
    through to its next transcript tier).
  - 200 with timed segments when captions exist.
"""

from __future__ import annotations

import os
from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

try:
    # Optional proxy support (recommended in production; cloud-host IPs get
    # blocked by YouTube). Enabled only when PROXY_USERNAME/PROXY_PASSWORD set.
    from youtube_transcript_api.proxies import WebshareProxyConfig
except Exception:  # pragma: no cover - older library versions
    WebshareProxyConfig = None  # type: ignore[assignment]

WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "").strip()
PROXY_USERNAME = os.environ.get("PROXY_USERNAME", "").strip()
PROXY_PASSWORD = os.environ.get("PROXY_PASSWORD", "").strip()

app = FastAPI(title="youtube-transcript-worker", version="1.0.0")


def _build_api() -> YouTubeTranscriptApi:
    if WebshareProxyConfig and PROXY_USERNAME and PROXY_PASSWORD:
        return YouTubeTranscriptApi(
            proxy_config=WebshareProxyConfig(
                proxy_username=PROXY_USERNAME,
                proxy_password=PROXY_PASSWORD,
            )
        )
    return YouTubeTranscriptApi()


class Segment(BaseModel):
    start: float
    duration: float
    text: str


class TranscriptRequest(BaseModel):
    video_id: str = Field(..., min_length=5, max_length=64)
    languages: Optional[List[str]] = None


class TranscriptResponse(BaseModel):
    video_id: str
    language: str
    segments: List[Segment]


def _require_auth(authorization: Optional[str]) -> None:
    if not WORKER_TOKEN:
        # Fail closed: never run unauthenticated.
        raise HTTPException(status_code=500, detail="WORKER_TOKEN is not configured")
    expected = f"Bearer {WORKER_TOKEN}"
    if not authorization or authorization.strip() != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/transcript", response_model=TranscriptResponse)
def transcript(
    body: TranscriptRequest,
    authorization: Optional[str] = Header(default=None),
) -> TranscriptResponse:
    _require_auth(authorization)

    languages = body.languages or ["en", "en-US", "en-GB"]
    api = _build_api()

    try:
        # Library >= 1.0 exposes .fetch(); older releases used .get_transcript().
        if hasattr(api, "fetch"):
            fetched = api.fetch(body.video_id, languages=languages)
            language = getattr(fetched, "language_code", languages[0])
            raw = fetched.to_raw_data()
        else:  # pragma: no cover - legacy fallback
            raw = YouTubeTranscriptApi.get_transcript(body.video_id, languages=languages)
            language = languages[0]
    except (TranscriptsDisabled, NoTranscriptFound):
        raise HTTPException(status_code=404, detail="No transcript available")
    except VideoUnavailable:
        raise HTTPException(status_code=404, detail="Video unavailable")
    except Exception as exc:  # network / parsing / IP-block errors
        raise HTTPException(status_code=502, detail=f"Transcript fetch failed: {exc}")

    segments = [
        Segment(
            start=float(item.get("start", 0.0)),
            duration=float(item.get("duration", 0.0)),
            text=str(item.get("text", "")).strip(),
        )
        for item in raw
        if str(item.get("text", "")).strip()
    ]

    if not segments:
        raise HTTPException(status_code=404, detail="Empty transcript")

    return TranscriptResponse(
        video_id=body.video_id,
        language=language,
        segments=segments,
    )