import { createRoot } from "react-dom/client";
import ConfigError from "@/components/ConfigError";
import { hasSupabaseEnv } from "@/lib/env";
import { initSentry } from "@/lib/sentry";
import "./index.css";

const root = document.getElementById("root")!;

async function bootstrap() {
  try {
    if (!hasSupabaseEnv()) {
      createRoot(root).render(<ConfigError />);
      return;
    }

    const appPromise = import("./App.tsx");

    const { default: App } = await appPromise;
    createRoot(root).render(<App />);
    scheduleSentryInit();
  } catch (e) {
    console.error("[bootstrap]", e);
    createRoot(root).render(<ConfigError />);
  }
}

void bootstrap();

function scheduleSentryInit() {
  window.setTimeout(() => {
    initSentry();
  }, 1500);
}
