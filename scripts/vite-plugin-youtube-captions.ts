import type { Plugin } from "vite";
import { transcriptPlusToTimedText } from "../src/lib/framework/transcriptPlusFormat";

const VIDEO_ID_RE = /^\/api\/youtube-captions\/([a-zA-Z0-9_-]{11})\/?$/;

/**
 * Dev-only: fetch YouTube captions from Node on the developer machine (residential IP).
 * Browser youtube-transcript-plus is CORS-blocked; Supabase edge IPs are often blocked too.
 */
export function youtubeCaptionsDevPlugin(): Plugin {
  return {
    name: "youtube-captions-dev",
    apply: "serve",
    configureServer(server) {
      // Pre-hook: must run before Vite SPA fallback, which would return index.html for /api/*.
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" || !req.url) return next();
        const path = req.url.split("?")[0] ?? "";
        const match = path.match(VIDEO_ID_RE);
        if (!match) return next();

        void (async () => {
          try {
            const videoId = match[1]!;
            const { fetchTranscript } = await import("youtube-transcript-plus");
            const segments = await fetchTranscript(videoId, { lang: "en" });
            const text = transcriptPlusToTimedText(segments);
            if (!text?.trim()) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "No captions returned" }));
              return;
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ text, source: "local-dev" }));
          } catch (err) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String((err as Error).message ?? err) }));
          }
        })();
      });
    },
  };
}
