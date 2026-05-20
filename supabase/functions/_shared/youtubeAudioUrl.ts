/**
 * Resolves a direct audio stream URL for third-party STT (Deepgram).
 * YouTube watch URLs are not accepted by Deepgram; AssemblyAI accepts watch URLs.
 */

const YT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const INNERTUBE_WEB = {
  apiKey: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
  clientName: "WEB",
  clientVersion: "2.20250626.01.00",
};

type StreamFormat = {
  mimeType?: string;
  url?: string;
  bitrate?: number;
  audioSampleRate?: string;
  signatureCipher?: string;
  cipher?: string;
};

/** Prefer highest-bitrate audio-only format with a direct (non-cipher) URL. */
export function pickBestDirectAudioUrl(formats: StreamFormat[]): string | null {
  const audio = formats.filter(
    (f) => f.mimeType?.startsWith("audio/") && f.url?.trim() && !f.signatureCipher && !f.cipher,
  );
  if (!audio.length) return null;
  audio.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return audio[0]?.url?.trim() ?? null;
}

function formatsFromPlayerResponse(json: unknown): StreamFormat[] {
  const streaming = (json as { streamingData?: { adaptiveFormats?: StreamFormat[]; formats?: StreamFormat[] } })
    ?.streamingData;
  return [...(streaming?.adaptiveFormats ?? []), ...(streaming?.formats ?? [])];
}

function parseJsonObjectFromHtml(html: string, marker: string): unknown | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;
  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function audioFromWatchPage(videoId: string): Promise<string | null> {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, { headers: YT_HEADERS });
  if (!res.ok) return null;
  const html = await res.text();
  const player = parseJsonObjectFromHtml(html, "ytInitialPlayerResponse");
  if (!player) return null;
  return pickBestDirectAudioUrl(formatsFromPlayerResponse(player));
}

type InnertubeClient = {
  clientName: string;
  clientVersion: string;
  androidSdkVersion?: number;
  hl: string;
  gl: string;
};

async function audioFromInnertubePlayer(videoId: string, client: InnertubeClient): Promise<string | null> {
  const u = `https://youtubei.googleapis.com/youtubei/v1/player?key=${INNERTUBE_WEB.apiKey}`;
  const res = await fetch(u, {
    method: "POST",
    headers: {
      ...YT_HEADERS,
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/",
    },
    body: JSON.stringify({
      context: { client },
      videoId,
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return pickBestDirectAudioUrl(formatsFromPlayerResponse(json));
}

/**
 * Best-effort direct audio URL for Deepgram. Returns null when only ciphered streams exist.
 */
export async function resolveYouTubeAudioUrl(videoId: string): Promise<string | null> {
  const override = Deno.env.get("DEEPGRAM_AUDIO_URL")?.trim();
  if (override) return override;

  const fromWatch = await audioFromWatchPage(videoId).catch(() => null);
  if (fromWatch) return fromWatch;

  const webClient: InnertubeClient = {
    clientName: INNERTUBE_WEB.clientName,
    clientVersion: INNERTUBE_WEB.clientVersion,
    hl: "en",
    gl: "US",
  };
  const fromWeb = await audioFromInnertubePlayer(videoId, webClient).catch(() => null);
  if (fromWeb) return fromWeb;

  const androidClient: InnertubeClient = {
    clientName: "ANDROID",
    clientVersion: "19.09.37",
    androidSdkVersion: 30,
    hl: "en",
    gl: "US",
  };
  return audioFromInnertubePlayer(videoId, androidClient).catch(() => null);
}
