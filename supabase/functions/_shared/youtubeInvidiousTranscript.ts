/**
 * Fetch YouTube captions via public Invidious instances (free, same caption tracks as YouTube).
 * Used when direct YouTube scraping from Supabase edge IPs fails.
 */

const DEFAULT_INSTANCES = [
  "https://inv.nadeko.net",
  "https://inv.thepixora.com",
  "https://invidious.f5.si",
  "https://invidious.nerdvpn.de",
  "https://invidious.fdn.fr",
];

let cachedInstances: string[] | null = null;
let cacheExpiresAt = 0;

async function loadHealthyInstances(): Promise<string[]> {
  if (cachedInstances && Date.now() < cacheExpiresAt) return cachedInstances;
  try {
    const res = await fetch("https://api.invidious.io/instances.json?sort_by=health", {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const list = (await res.json()) as [string, { uri?: string; type?: string }][];
      const uris = list
        .map(([, meta]) => meta.uri?.replace(/\/+$/, ""))
        .filter((uri): uri is string => {
          if (!uri) return false;
          if (!uri.startsWith("https://")) return false;
          if (/\.onion|\.i2p|\.ygg$/i.test(uri)) return false;
          return true;
        })
        .slice(0, 8);
      if (uris.length) {
        cachedInstances = uris;
        cacheExpiresAt = Date.now() + 60 * 60 * 1000;
        return uris;
      }
    }
  } catch {
    /* use defaults */
  }
  return DEFAULT_INSTANCES;
}

const FETCH_TIMEOUT_MS = 12_000;

type CaptionTrack = { label?: string; languageCode?: string; url?: string };

async function instancesFromEnv(): Promise<string[]> {
  const raw = Deno.env.get("INVIDIOUS_INSTANCES")?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  }
  return loadHealthyInstances();
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function parseVttTimestamp(ts: string): number {
  const parts = ts.trim().split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

/** Convert WebVTT caption body to `[M:SS] line` text (matches other caption tiers). */
export function parseWebVttToTimedText(vtt: string): string | null {
  const normalized = vtt.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const lines: string[] = [];
  const blocks = normalized.split(/\n\n+/);

  for (const block of blocks) {
    const rows = block.split("\n").map((r) => r.trim()).filter(Boolean);
    if (rows.length < 2) continue;
    if (rows[0].toUpperCase() === "WEBVTT" || rows[0].startsWith("NOTE")) continue;

    let timeRowIdx = 0;
    if (!rows[0].includes("-->") && rows[1]?.includes("-->")) timeRowIdx = 1;
    const timeRow = rows[timeRowIdx];
    if (!timeRow?.includes("-->")) continue;

    const startPart = timeRow.split("-->")[0]?.trim().split(" ")[0] ?? "";
    const startSeconds = Math.floor(parseVttTimestamp(startPart.replace(",", ".")));
    const text = rows.slice(timeRowIdx + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    lines.push(`[${formatTime(startSeconds)}] ${text}`);
  }

  return lines.join("\n").trim() || null;
}

function pickEnglishTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  const en =
    tracks.find((t) => t.languageCode === "en" && !String(t.label ?? "").toLowerCase().includes("auto")) ??
    tracks.find((t) => /^en/i.test(t.languageCode ?? "")) ??
    tracks.find((t) => /english/i.test(t.label ?? "")) ??
    tracks.find((t) => /^en/i.test(t.label ?? "")) ??
    tracks[0];
  return en ?? null;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromInstance(base: string, videoId: string): Promise<string | null> {
  const listUrl = `${base}/api/v1/captions/${encodeURIComponent(videoId)}`;
  const listRes = await fetchWithTimeout(listUrl, {
    headers: { Accept: "application/json" },
  });
  if (!listRes.ok) return null;

  const listJson = (await listRes.json()) as { captions?: CaptionTrack[] };
  const tracks = listJson.captions ?? [];
  const track = pickEnglishTrack(tracks);
  if (!track) return null;

  let captionUrl: string;
  if (track.url?.startsWith("http")) {
    captionUrl = track.url;
  } else if (track.url?.startsWith("/")) {
    captionUrl = `${base}${track.url}`;
  } else if (track.languageCode) {
    captionUrl = `${base}/api/v1/captions/${encodeURIComponent(videoId)}?lang=${encodeURIComponent(track.languageCode)}`;
  } else {
    return null;
  }

  const capRes = await fetchWithTimeout(captionUrl, { headers: { Accept: "text/vtt" } });
  if (!capRes.ok) return null;
  const vtt = await capRes.text();
  return parseWebVttToTimedText(vtt);
}

/**
 * Try public Invidious mirrors until captions are returned or all instances fail.
 */
export async function fetchInvidiousTranscript(videoId: string): Promise<string | null> {
  if (!videoId.trim()) return null;
  const errors: string[] = [];

  for (const base of await instancesFromEnv()) {
    try {
      const text = await fetchFromInstance(base, videoId);
      if (text) return text;
      errors.push(`${base}: empty`);
    } catch (e) {
      errors.push(`${base}: ${String((e as Error).message ?? e).slice(0, 80)}`);
    }
  }

  if (errors.length) {
    throw new Error(errors.join(" | "));
  }
  return null;
}
