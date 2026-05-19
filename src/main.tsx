import { createRoot } from "react-dom/client";
import "./index.css";
import { hasSupabaseEnv } from "@/lib/env";

const root = document.getElementById("root")!;

async function bootstrap() {
  if (!hasSupabaseEnv()) {
    const { default: ConfigError } = await import("@/components/ConfigError");
    createRoot(root).render(<ConfigError />);
    return;
  }

  const { default: App } = await import("./App.tsx");
  createRoot(root).render(<App />);
}

void bootstrap();
