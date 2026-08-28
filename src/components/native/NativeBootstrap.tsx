import { useEffect, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { useTheme } from "next-themes";
import { hideNativeSplash } from "@/lib/native/nativeSplash";
import {
  readNativeDarkSurfaceActive,
  resolveNativeStatusBarAppearance,
  subscribeNativeDarkSurface,
} from "@/lib/native/nativeStatusBar";

/** Hold the branded launch screen until React has painted usable app chrome. */
export function NativeBootstrap() {
  const { resolvedTheme } = useTheme();
  const darkSurfaceActive = useSyncExternalStore(
    subscribeNativeDarkSurface,
    readNativeDarkSurfaceActive,
    readNativeDarkSurfaceActive,
  );
  const darkAppChrome =
    darkSurfaceActive ||
    resolvedTheme === "dark" ||
    (resolvedTheme == null && document.documentElement.classList.contains("dark"));
  const nativeStatusBarAppearance = resolveNativeStatusBarAppearance({
    resolvedTheme,
    darkSurfaceActive,
  });

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", darkAppChrome ? "#000000" : "#ffffff");
    document
      .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.setAttribute("content", darkAppChrome ? "black" : "default");
  }, [darkAppChrome]);

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
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({
          color: nativeStatusBarAppearance.backgroundColor,
        });
        // Capacitor's enum describes the status-bar style, not icon color:
        // Style.Dark maps to iOS lightContent.
        await StatusBar.setStyle({
          style: nativeStatusBarAppearance.lightIcons ? Style.Dark : Style.Light,
        });
      })
      .catch((error) => console.warn("[native] could not style the status bar", error));
  }, [nativeStatusBarAppearance.backgroundColor, nativeStatusBarAppearance.lightIcons]);

  return null;
}
