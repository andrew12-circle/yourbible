import { createRoot } from "react-dom/client";
import ConfigError from "@/components/ConfigError";
import { hasSupabaseEnv } from "@/lib/env";
import "./index.css";

const root = document.getElementById("root")!;

async function bootstrap() {
  try {
    if (!hasSupabaseEnv()) {
      createRoot(root).render(<ConfigError />);
      return;
    }

    const { default: App } = await import("./App.tsx");
    createRoot(root).render(<App />);
  } catch (e) {
    console.error("[bootstrap]", e);
    createRoot(root).render(<ConfigError />);
  }
}

void bootstrap();
