import type { Plugin } from "vite";
import { ensureVisualBibleAssets } from "./acquire-visual-bible.mjs";
import { verifyVisualBibleDist } from "./verify-visual-bible-dist.mjs";

/** Production and dev both ship first-party images; page turns never query museums. */
export function visualBibleAssetsPlugin(): Plugin {
  let build = false;
  let root = process.cwd();
  let outDir = "dist";
  let task: Promise<void> | undefined;
  const ensure = () => task ??= ensureVisualBibleAssets({ root });
  return {
    name: "visual-bible-assets",
    async configResolved(config) {
      build = config.command === "build";
      root = config.root;
      outDir = config.build.outDir;
      // Complete acquisition before Vite copies publicDir, including on Vercel.
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
