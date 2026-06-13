const DEV_API_UNAVAILABLE =
  "dev caption API unavailable — stop and restart npm run dev so the Vite plugin loads";

/** Same-origin dev API (Vite plugin) — captions fetched from Node on your machine, not blocked like edge. */
export async function fetchYoutubeCaptionsViaLocalDevApi(
  videoId: string,
): Promise<{ text: string | null; source?: string; error?: string }> {
  if (!import.meta.env.DEV) {
    return { text: null, error: "local-dev API is dev-only" };
  }

  try {
    const res = await fetch(`/api/youtube-captions/${encodeURIComponent(videoId)}`, {
      credentials: "same-origin",
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return { text: null, error: DEV_API_UNAVAILABLE };
    }
    if (res.status === 404) return { text: null, error: "no captions" };
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return { text: null, error: body?.error ?? `HTTP ${res.status}` };
    }
    const body = (await res.json()) as { text?: string; source?: string };
    const text = body.text?.trim();
    if (!text) return { text: null, error: "empty response" };
    return { text, source: body.source ?? "local-dev" };
  } catch (err) {
    return { text: null, error: String((err as Error).message ?? err) };
  }
}
