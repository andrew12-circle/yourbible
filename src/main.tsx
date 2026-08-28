import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import ConfigError from "@/components/ConfigError";
import { hasSupabaseEnv } from "@/lib/env";
import { initSentry } from "@/lib/sentry";
import { installNativeKeyboard } from "@/lib/native/nativeKeyboard";
import {
  armNativeSplashFallback,
  hideNativeSplashAfterPaint,
} from "@/lib/native/nativeSplash";
import "./index.css";

if (Capacitor.isNativePlatform()) {
  // The native status bar owns the top inset outside the WebView.
  document.documentElement.classList.add("native-app");
}

const root = document.getElementById("root")!;

async function bootstrap() {
  try {
    initSentry();
    installNativeKeyboard();
    armNativeSplashFallback();

    if (!hasSupabaseEnv()) {
      createRoot(root).render(<ConfigError />);
      hideNativeSplashAfterPaint();
      return;
    }

    const appPromise = import("./App.tsx");

    const { default: App } = await appPromise;
    createRoot(root).render(<App />);
  } catch (e) {
    console.error("[bootstrap]", e);
    createRoot(root).render(<ConfigError />);
    hideNativeSplashAfterPaint();
  }
}

void bootstrap();
