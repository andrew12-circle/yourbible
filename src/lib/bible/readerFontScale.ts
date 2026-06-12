export const LS_FONT_SCALE_KEY = "yb.fontScale";
const LS_FONT_SCALE_BASELINE_KEY = "yb.fontScale.desktopBaselineV1";

/** Slider range shown in the reader UI (display %). */
export const READER_FONT_SCALE_MIN = 0.85;
export const READER_FONT_SCALE_MAX = 1.5;
export const READER_FONT_SCALE_DEFAULT = 1;

/**
 * On spread/desktop layout, 100% display = old 85% rendered size.
 * Applied as an em multiplier on top of the user-facing scale.
 */
export const READER_DESKTOP_FONT_BASE = 0.85;

export function clampReaderFontScale(scale: number): number {
  return Math.min(READER_FONT_SCALE_MAX, Math.max(READER_FONT_SCALE_MIN, +scale.toFixed(2)));
}

/** Effective em multiplier for scripture typography (paginator + live page). */
export function effectiveReaderFontScaleEm(
  displayScale: number,
  desktopSpread: boolean,
): number {
  const clamped = clampReaderFontScale(displayScale);
  return clamped * (desktopSpread ? READER_DESKTOP_FONT_BASE : 1);
}

export function readStoredReaderFontScale(): number {
  const raw = parseFloat(localStorage.getItem(LS_FONT_SCALE_KEY) ?? "");
  let scale = Number.isFinite(raw) ? raw : READER_FONT_SCALE_DEFAULT;

  if (typeof localStorage !== "undefined" && !localStorage.getItem(LS_FONT_SCALE_BASELINE_KEY)) {
    if (Math.abs(scale - READER_DESKTOP_FONT_BASE) < 0.02) {
      scale = READER_FONT_SCALE_DEFAULT;
    }
    localStorage.setItem(LS_FONT_SCALE_BASELINE_KEY, "1");
    if (Number.isFinite(raw)) {
      localStorage.setItem(LS_FONT_SCALE_KEY, String(clampReaderFontScale(scale)));
    }
  }

  return clampReaderFontScale(scale);
}

export function writeStoredReaderFontScale(scale: number): void {
  localStorage.setItem(LS_FONT_SCALE_KEY, String(clampReaderFontScale(scale)));
}
