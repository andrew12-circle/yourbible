import { createClient } from "@supabase/supabase-js";
import { fetchTranscript } from "youtube-transcript-plus";

const requests = new Map<string, { count: number; until: number }>();
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Authenticated caption retrieval on our existing Node host, independent of edge egress.
 * No arbitrary URLs, proxy cookies, paid transcription calls, or service-role credentials.
 */
export async function POST(request: Request): Promise<Response> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer \S+$/i.test(authorization)) return json({ error: "Sign in to retrieve captions." }, 401);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return json({ error: "Caption service authentication is not configured." }, 503);
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) } });
    const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer /i, ""));
    if (error || !data.user) return json({ error: "Sign in to retrieve captions." }, 401);
    if (Number(request.headers.get("content-length") ?? 0) > 1024) return json({ error: "Request too large." }, 413);
    const body = await request.text();
    if (body.length > 1024) return json({ error: "Request too large." }, 413);
    let videoId: unknown;
    try { videoId = JSON.parse(body)?.video_id; } catch { return json({ error: "Invalid JSON." }, 400); }
    if (typeof videoId !== "string" || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return json({ error: "A valid video_id is required." }, 400);
    // Bounded per-instance burst control, not a claim of a distributed quota.
    const now = Date.now();
    for (const [id, state] of requests) if (state.until <= now) requests.delete(id);
    const state = requests.get(data.user.id) ?? { count: 0, until: now + 60_000 };
    if (state.count >= 10 || requests.size >= 4096) return json({ error: "Caption requests are temporarily rate limited." }, 429);
    state.count += 1; requests.set(data.user.id, state);
    const segments = await fetchTranscript(videoId, { signal: AbortSignal.timeout(18_000), retries: 0 });
    const valid = segments.filter((segment) => typeof segment.text === "string" && segment.text.trim()
      && Number.isFinite(segment.offset) && segment.offset >= 0 && Number.isFinite(segment.duration) && segment.duration >= 0);
    if (!valid.length) return json({ error: "No usable captions were returned for this video." }, 404);
    if (valid.length !== segments.length || valid.reduce((n, s) => n + s.text.length, 0) > 1_000_000) return json({ error: "Caption response failed validation." }, 502);
    return json({ video_id: videoId, provider: "vercel_youtube_captions", segments: valid.map((segment) => ({
      text: segment.text, start: segment.offset, duration: segment.duration,
    })) });
  } catch (cause) {
    const timeout = cause instanceof Error && /timeout|aborted/i.test(cause.name + cause.message);
    // Do not echo provider HTML, URL query credentials, or infer removal from a scraper failure.
    return json({ error: timeout ? "Caption retrieval timed out." : "YouTube captions could not be retrieved from this server." }, timeout ? 504 : 502);
  }
}
