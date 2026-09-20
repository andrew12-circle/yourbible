import type { Plugin } from "vite";
import { ensureVisualBibleAssets } from "./acquire-visual-bible.mjs";

/** Build and dev servers acquire files; client page turns never query providers. */
export function visualBibleAssetsPlugin(): Plugin {
  let build = false;
  let root = process.cwd();
  let task: Promise<void> | undefined;
  const ensure = () => task ??= ensureVisualBibleAssets({ root });
  return {
    name: "visual-bible-assets",
    configResolved(config) { build = config.command === "build"; root = config.root; },
    async buildStart() { if (build) await ensure(); },
    configureServer(server) {
      let failure: unknown;
      const ready = ensure().catch((error: unknown) => { failure = error; server.config.logger.error(`Visual library acquisition failed: ${String(error)}`); });
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith("/visual-bible/")) { next(); return; }
        void ready.then(() => {
          if (failure) { response.statusCode = 503; response.end("Visual library assets unavailable; check acquisition logs."); }
          else next();
        });
      });
    },
  };
}
