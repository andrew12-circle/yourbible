import { useEffect, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { hideNativeSplash } from "@/lib/native/nativeSplash";
import {
  nativeStatusBarNeedsLightIcons,
  readNativeDarkSurfaceActive,
  subscribeNativeDarkSurface,
} from "@/lib/native/nativeStatusBar";

/** Hold the branded launch screen until React has painted usable app chrome. */
export function NativeBootstrap() {
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
  const darkSurfaceActive = useSyncExternalStore(
    subscribeNativeDarkSurface,
    readNativeDarkSurfaceActive,
    readNativeDarkSurfaceActive,
  );

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (!cancelled) void hideNativeSplash();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void import("@capacitor/status-bar")
      .then(async ({ StatusBar, Style }) => {
        await StatusBar.setOverlaysWebView({ overlay: true });
        const lightIcons = nativeStatusBarNeedsLightIcons({
          pathname,
          resolvedTheme,
          darkSurfaceActive,
        });
        // Capacitor's enum describes the status-bar style, not icon color:
        // Style.Dark maps to iOS lightContent.
        await StatusBar.setStyle({ style: lightIcons ? Style.Dark : Style.Light });
      })
      .catch((error) => console.warn("[native] could not style the status bar", error));
  }, [darkSurfaceActive, pathname, resolvedTheme]);

  return null;
}
