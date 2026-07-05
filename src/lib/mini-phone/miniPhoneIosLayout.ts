import type { CSSProperties } from "react";
import { IOS_DOCK_ICON_PT, IOS_GRID_ICON_PT } from "@/lib/home/iosHomeLayout";
import { MINI_PHONE_LAYOUT_WIDTH } from "@/lib/mini-phone/miniPhoneDimensions";

export { IOS_DOCK_ICON_PT, IOS_GRID_ICON_PT };
export { MINI_PHONE_LAYOUT_WIDTH };

/** Minimum wallpaper blur (px) on the full-screen reference; scaled for mini phone. */
export const IOS_WALLPAPER_BLUR_PT = 36;

export function iosScaledPx(phoneWidth: number, iosPt: number): number {
  return Math.round((phoneWidth * iosPt) / MINI_PHONE_LAYOUT_WIDTH);
}

export function iosWallpaperBlurPx(phoneWidth: number, userBlur: number): number {
  const scaledMin = Math.round((phoneWidth * IOS_WALLPAPER_BLUR_PT) / MINI_PHONE_LAYOUT_WIDTH);
  return Math.max(userBlur, scaledMin);
}

/** Estimated row height (icon + label + gaps) for the mini phone launcher grid. */
export function miniPhoneRowStride(phoneWidth: number): number {
  const scale = phoneWidth / MINI_PHONE_LAYOUT_WIDTH;
  const iconSize = iosScaledPx(phoneWidth, IOS_GRID_ICON_PT);
  const labelH = Math.round(11 * scale);
  const iconLabelGap = Math.round(4 * scale);
  const rowGap = Math.round(20 * scale);
  return iconSize + iconLabelGap + labelH + rowGap;
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
