/** Reference iPhone logical width (pt) for home-screen proportions. */
export const IOS_HOME_SCREEN_WIDTH = 393;

/** Grid icon size on iOS home screen (pt). */
export const IOS_GRID_ICON_PT = 60;

/** Dock icon size — same as grid on modern iOS. */
export const IOS_DOCK_ICON_PT = 60;

/** Minimum wallpaper blur (px) on the full-screen reference; scaled for mini phone. */
export const IOS_WALLPAPER_BLUR_PT = 36;

export function iosScaledPx(phoneWidth: number, iosPt: number): number {
  return Math.round((phoneWidth * iosPt) / IOS_HOME_SCREEN_WIDTH);
}

export function iosWallpaperBlurPx(phoneWidth: number, userBlur: number): number {
  const scaledMin = Math.round((phoneWidth * IOS_WALLPAPER_BLUR_PT) / IOS_HOME_SCREEN_WIDTH);
  return Math.max(userBlur, scaledMin);
}

/** Estimated row height (icon + label + gaps) for the mini phone launcher grid. */
export function miniPhoneRowStride(phoneWidth: number): number {
  const scale = phoneWidth / IOS_HOME_SCREEN_WIDTH;
  const iconSize = iosScaledPx(phoneWidth, IOS_GRID_ICON_PT);
  const labelH = Math.round(11 * scale);
  const iconLabelGap = Math.round(4 * scale);
  const rowGap = Math.round(20 * scale);
  return iconSize + iconLabelGap + labelH + rowGap;
}

export const MINI_PHONE_DOCK_LABELS = ["Bible", "Journal", "Daily", "Settings"] as const;
