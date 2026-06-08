import { createRoot } from "react-dom/client";
import ConfigError from "@/components/ConfigError";
import { hasSupabaseEnv } from "@/lib/env";
import { initSentry } from "@/lib/sentry";
import "./index.css";

const root = document.getElementById("root")!;

async function bootstrap() {
  try {
    initSentry();

    if (!hasSupabaseEnv()) {
      createRoot(root).render(<ConfigError />);
      return;
    }

    const appPromise = import("./App.tsx");

    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      void import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
    }

    const { default: App } = await appPromise;
    createRoot(root).render(<App />);
  } catch (e) {
    console.error("[bootstrap]", e);
    createRoot(root).render(<ConfigError />);
  }
}

void bootstrap();
