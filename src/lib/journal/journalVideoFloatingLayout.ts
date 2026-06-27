/** Matches centered `JournalVideoCaptureDialog` camera layout (sm:max-w-3xl + aspect-video). */
export const JOURNAL_VIDEO_DIALOG_MAX_WIDTH_PX = 768;
export const JOURNAL_VIDEO_DIALOG_MAX_VIDEO_HEIGHT_PX = 810;
export const JOURNAL_VIDEO_FLOAT_CHROME_HEIGHT_PX = 36;
export const JOURNAL_VIDEO_FLOAT_MIN_WIDTH_PX = 280;
export const JOURNAL_VIDEO_FLOAT_ASPECT = 16 / 9;

export type ViewportSize = { width: number; height: number };

export type FloatingPanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Video area size — same rules as the non-floating dialog body. */
export function journalVideoDialogVideoSize(
  viewport: ViewportSize = {
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  },
): { width: number; height: number } {
  const maxW = Math.min(JOURNAL_VIDEO_DIALOG_MAX_WIDTH_PX, viewport.width - 32);
  const maxVideoH = Math.min(viewport.height * 0.72, JOURNAL_VIDEO_DIALOG_MAX_VIDEO_HEIGHT_PX);

  let videoW = maxW;
  let videoH = videoW / JOURNAL_VIDEO_FLOAT_ASPECT;
  if (videoH > maxVideoH) {
    videoH = maxVideoH;
    videoW = videoH * JOURNAL_VIDEO_FLOAT_ASPECT;
  }

  return {
    width: Math.round(videoW),
    height: Math.round(videoH),
  };
}

export function journalVideoFloatingDefaultRect(
  viewport: ViewportSize = {
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  },
): FloatingPanelRect {
  const video = journalVideoDialogVideoSize(viewport);
  const width = video.width;
  const height = video.height + JOURNAL_VIDEO_FLOAT_CHROME_HEIGHT_PX;
  return {
    width,
    height,
    x: Math.max(8, Math.round((viewport.width - width) / 2)),
    y: Math.max(8, Math.round((viewport.height - height) / 2)),
  };
}

/** Clamp resize while keeping 16:9 video area + chrome. */
export function journalVideoFloatingResize(
  start: FloatingPanelRect,
  deltaX: number,
  deltaY: number,
  viewport: ViewportSize,
): FloatingPanelRect {
  const minVideoH =
    JOURNAL_VIDEO_FLOAT_MIN_WIDTH_PX / JOURNAL_VIDEO_FLOAT_ASPECT;
  const minHeight = minVideoH + JOURNAL_VIDEO_FLOAT_CHROME_HEIGHT_PX;

  let width = Math.max(JOURNAL_VIDEO_FLOAT_MIN_WIDTH_PX, start.width + deltaX);
  let videoH = width / JOURNAL_VIDEO_FLOAT_ASPECT;
  let height = videoH + JOURNAL_VIDEO_FLOAT_CHROME_HEIGHT_PX;

  const maxVideo = journalVideoDialogVideoSize(viewport);
  const maxHeight = maxVideo.height + JOURNAL_VIDEO_FLOAT_CHROME_HEIGHT_PX;
  if (height > maxHeight) {
    height = maxHeight;
    videoH = height - JOURNAL_VIDEO_FLOAT_CHROME_HEIGHT_PX;
    width = videoH * JOURNAL_VIDEO_FLOAT_ASPECT;
  }

  if (height < minHeight) {
    height = minHeight;
    videoH = height - JOURNAL_VIDEO_FLOAT_CHROME_HEIGHT_PX;
    width = videoH * JOURNAL_VIDEO_FLOAT_ASPECT;
  }

  return {
    x: start.x,
    y: start.y,
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function clampFloatingPanelPosition(
  rect: FloatingPanelRect,
  viewport: ViewportSize,
): FloatingPanelRect {
  const maxX = Math.max(8, viewport.width - rect.width - 8);
  const maxY = Math.max(8, viewport.height - rect.height - 8);
  return {
    ...rect,
    x: Math.min(Math.max(8, rect.x), maxX),
    y: Math.min(Math.max(8, rect.y), maxY),
  };
}
