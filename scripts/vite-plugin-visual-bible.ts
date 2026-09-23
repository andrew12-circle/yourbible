import type { Plugin } from "vite";
import { ensureVisualBibleAssets } from "./acquire-visual-bible.mjs";
import { verifyVisualBibleDist } from "./verify-visual-bible-dist.mjs";

/** Deploy the verified bundle; never rely on museum uptime for a Vercel release. */
export function visualBibleAssetsPlugin(): Plugin {
  let build = false;
  let root = process.cwd();
  let outDir = "dist";
  let task: Promise<void> | undefined;
  const ensure = () => task ??= ensureVisualBibleAssets({ root, verify: Boolean(process.env.VERCEL) });
  return {
    name: "visual-bible-assets",
    async configResolved(config) {
      build = config.command === "build";
      root = config.root;
      outDir = config.build.outDir;
      // The acquired image bundle is committed. Vercel only verifies it offline.
      // Development can acquire intentionally added catalog records before copying.
      if (build) await ensure();
    },
    async writeBundle() { if (build) await verifyVisualBibleDist({ root, outDir }); },
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
