import type { CSSProperties } from "react";
import { IOS_HOME_SCREEN_WIDTH, iosHomeRowStride } from "@/lib/home/iosHomeLayout";
export {
  IOS_DOCK_ICON_PT,
  IOS_GRID_ICON_PT,
  IOS_HOME_SCREEN_WIDTH,
  iosScaledPx,
} from "@/lib/home/iosHomeLayout";

/** Minimum wallpaper blur (px) on the full-screen reference; scaled for mini phone. */
export const IOS_WALLPAPER_BLUR_PT = 36;

export function iosWallpaperBlurPx(phoneWidth: number, userBlur: number): number {
  const scaledMin = Math.round((phoneWidth * IOS_WALLPAPER_BLUR_PT) / IOS_HOME_SCREEN_WIDTH);
  return Math.max(userBlur, scaledMin);
}

/** Estimated row height (icon + label + gaps) for the mini phone launcher grid. */
export function miniPhoneRowStride(phoneWidth: number): number {
  return iosHomeRowStride(phoneWidth);
}

export const MINI_PHONE_DOCK_LABELS = ["Bible", "Journal", "Daily", "Settings"] as const;

/** Self-contained default wallpaper — never uses viewport-fixed attachment. */
export const DEFAULT_MINI_PHONE_WALLPAPER_STYLE: CSSProperties = {
  backgroundColor: "hsl(220 60% 12%)",
  backgroundImage: [
    "radial-gradient(circle at 18% 12%, hsl(280 95% 62% / 0.95) 0px, transparent 40%)",
    "radial-gradient(circle at 82% 18%, hsl(330 100% 64% / 0.9) 0px, transparent 42%)",
    "radial-gradient(circle at 92% 78%, hsl(28 100% 60% / 0.85) 0px, transparent 45%)",
    "radial-gradient(circle at 8% 88%, hsl(200 100% 58% / 0.9) 0px, transparent 45%)",
    "radial-gradient(circle at 50% 55%, hsl(260 90% 55% / 0.55) 0px, transparent 60%)",
  ].join(", "),
  backgroundAttachment: "scroll",
};
