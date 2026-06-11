/** Reference iPhone logical width (pt) for home-screen proportions. */
export const IOS_HOME_SCREEN_WIDTH = 393;

/** Grid icon size on iOS home screen (pt). */
export const IOS_GRID_ICON_PT = 60;

/** Dock icon size — same as grid on modern iOS. */
export const IOS_DOCK_ICON_PT = 60;

export function iosScaledPx(viewportWidth: number, iosPt: number): number {
  return Math.round((viewportWidth * iosPt) / IOS_HOME_SCREEN_WIDTH);
}

export function iosHomeGridGapX(viewportWidth: number): number {
  return Math.max(8, Math.round((viewportWidth * 19) / IOS_HOME_SCREEN_WIDTH));
}

export function iosHomeGridGapY(viewportWidth: number): number {
  return Math.max(12, Math.round((viewportWidth * 22) / IOS_HOME_SCREEN_WIDTH));
}

/** Estimated row height (icon + label + gaps) for the home launcher grid. */
export function iosHomeRowStride(viewportWidth: number): number {
  const scale = viewportWidth / IOS_HOME_SCREEN_WIDTH;
  const iconSize = iosScaledPx(viewportWidth, IOS_GRID_ICON_PT);
  const labelH = Math.round(11 * scale);
  const iconLabelGap = Math.round(4 * scale);
  const rowGap = Math.round(20 * scale);
  return iconSize + iconLabelGap + labelH + rowGap;
}
