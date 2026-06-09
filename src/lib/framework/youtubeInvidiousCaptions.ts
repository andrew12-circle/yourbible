/**
 * Fetch YouTube captions via public Invidious mirrors from the browser (free).
 * Uses the user's network — helpful when server-side YouTube scraping is blocked.
 */

const DEFAULT_INSTANCES = [
  "https://inv.nadeko.net",
  "https://inv.thepixora.com",
  "https://invidious.f5.si",
  "https://invidious.nerdvpn.de",
];

type CaptionTrack = { label?: string; languageCode?: string; url?: string };

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

export function parseWebVttToTimedText(vtt: string): string | null {
  const normalized = vtt.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const lines: string[] = [];
  for (const block of normalized.split(/\n\n+/)) {
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
  return (
    tracks.find((t) => t.languageCode === "en" && !String(t.label ?? "").toLowerCase().includes("auto")) ??
    tracks.find((t) => /^en/i.test(t.languageCode ?? "")) ??
    tracks.find((t) => /english/i.test(t.label ?? "")) ??
    tracks[0] ??
    null
  );
}

async function fetchFromInstance(base: string, videoId: string): Promise<string | null> {
  const listRes = await fetch(`${base}/api/v1/captions/${encodeURIComponent(videoId)}`, {
    headers: { Accept: "application/json" },
  });
  if (!listRes.ok) return null;

  const listJson = (await listRes.json()) as { captions?: CaptionTrack[] };
  const track = pickEnglishTrack(listJson.captions ?? []);
  if (!track) return null;

  const captionUrl = track.url?.startsWith("http")
    ? track.url
    : track.url?.startsWith("/")
      ? `${base}${track.url}`
      : track.languageCode
        ? `${base}/api/v1/captions/${encodeURIComponent(videoId)}?lang=${encodeURIComponent(track.languageCode)}`
        : null;
  if (!captionUrl) return null;

  const capRes = await fetch(captionUrl, { headers: { Accept: "text/vtt" } });
  if (!capRes.ok) return null;
  return parseWebVttToTimedText(await capRes.text());
}

/** Try Invidious mirrors until captions are found (browser fetch). */
export async function fetchYoutubeCaptionsViaInvidious(videoId: string): Promise<string | null> {
  for (const base of DEFAULT_INSTANCES) {
    try {
      const text = await fetchFromInstance(base.replace(/\/+$/, ""), videoId);
      if (text) return text;
    } catch {
      /* try next instance */
    }
  }
  return null;
}
