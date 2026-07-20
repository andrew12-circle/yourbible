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
      includeAssets: [
        "app-icon-32.png",
        "app-icon-180.png",
        "app-icon-192.png",
        "app-icon-512.png",
        "apple-touch-icon.png",
        "favicon.ico",
        "favicon.svg",
        "site.webmanifest",
      ],
      manifest: false,
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/(?:app-icon|icon|favicon|apple-touch-icon|framework-icon|placeholder).*$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "app-shell-images",
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
