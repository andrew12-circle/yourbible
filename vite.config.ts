import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";
import { youtubeCaptionsDevPlugin } from "./scripts/vite-plugin-youtube-captions";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8083,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    youtubeCaptionsDevPlugin(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["app-icon-192.png", "app-icon-512.png", "site.webmanifest"],
      manifest: false,
      workbox: {
        // The complete CSB corpus and its full-text search index are public
        // JSON assets. Precache them with the app so reader navigation and
        // search remain offline and never need an API.Bible fallback.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,json}"],
        // Children's-book illustrations are a separate, nearly 500 MB library.
        // Precaching them alongside the Bible can make the reader's offline
        // install exceed browser storage quotas on phones.
        globIgnores: ["children-books/**/*"],
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "node:fs/promises": path.resolve(__dirname, "./src/lib/shims/node-fs-promises.ts"),
      "fs/promises": path.resolve(__dirname, "./src/lib/shims/node-fs-promises.ts"),
      "node:path": path.resolve(__dirname, "./src/lib/shims/node-path.ts"),
      path: path.resolve(__dirname, "./src/lib/shims/node-path.ts"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("pdfjs-dist")) return "vendor-pdfjs";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@sentry")) return "vendor-sentry";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("react-router") || id.includes("react-dom") || /\/react\//.test(id)) return "vendor-react";
        },
      },
    },
  },
}));
