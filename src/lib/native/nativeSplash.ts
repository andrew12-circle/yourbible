import { Capacitor } from "@capacitor/core";

let fallbackTimer: number | undefined;
let hidePromise: Promise<void> | undefined;

/** Ensure a failed or stalled React bootstrap can never strand the native splash indefinitely. */
export function armNativeSplashFallback(delayMs = 4_000): void {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform() || fallbackTimer) return;
  fallbackTimer = window.setTimeout(() => {
    fallbackTimer = undefined;
    void hideNativeSplash();
  }, delayMs);
}

/** Idempotent handoff from the native launch screen to the first usable React frame. */
export function hideNativeSplash(): Promise<void> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return Promise.resolve();
  if (fallbackTimer) {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = undefined;
  }
  hidePromise ??= import("@capacitor/splash-screen")
    .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 180 }))
    .catch((error) => {
      console.warn("[native] could not hide splash screen", error);
    });
  return hidePromise;
}

export function hideNativeSplashAfterPaint(): void {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
  window.requestAnimationFrame(() => void hideNativeSplash());
}
