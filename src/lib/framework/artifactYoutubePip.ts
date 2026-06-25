/** Chrome overlays the video; no dedicated header band in layout math. */
export const PIP_HEADER_PX = 0;
export const PIP_MIN_W = 300;
export const PIP_MAX_W = 640;
export const PIP_VIEWPORT_PAD = 8;

/** Below this visible ratio (in scroll root), enter picture-in-picture. */
export const PIP_ENTER_VISIBLE_RATIO = 0.1;
/** Above this ratio while not in PiP, cancel a pending enter (wider band reduces scroll flicker). */
export const PIP_ENTER_CANCEL_RATIO = 0.25;
/** Above this visible ratio, restore the in-flow player (hero card anchor). */
export const PIP_EXIT_VISIBLE_RATIO = 0.28;
export const PIP_ENTER_DELAY_MS = 100;
export const PIP_EXIT_DELAY_MS = 150;
export const PIP_IO_THRESHOLDS = [0, 0.1, 0.25, 0.5, 0.75, 1] as const;

export type PipVisibilitySignal = "enter" | "exit" | "cancel_enter" | "cancel_exit" | "hold";

/** Hysteresis: stay in PIP between enter/exit ratios until debounced transition completes. */
/**
 * PiP IO uses the study scroll root when the slot is inside it and that column scrolls (lg split pane).
 * Tablet uses window scroll (viewport root) even though the slot is in the same DOM subtree.
 */
export function shouldUseScrollRootForPipIo(
  scrollRoot: HTMLElement | null,
  target: HTMLElement | null,
  splitPaneScrollRoot: boolean,
): boolean {
  return Boolean(scrollRoot && target && scrollRoot.contains(target) && splitPaneScrollRoot);
}

/** Match IntersectionObserver ratio for PiP enter/exit (viewport or scroll-root root). */
export function intersectionRatioForPipTarget(target: Element, root: Element | null): number {
  const targetRect = target.getBoundingClientRect();
  if (targetRect.height <= 0) return 0;

  const rootTop = root ? root.getBoundingClientRect().top : 0;
  const rootBottom = root ? root.getBoundingClientRect().bottom : window.innerHeight;
  const visibleTop = Math.max(targetRect.top, rootTop);
  const visibleBottom = Math.min(targetRect.bottom, rootBottom);
  const visibleH = Math.max(0, visibleBottom - visibleTop);
  return visibleH / targetRect.height;
}

/** Block enter until the slot has been at least half visible (avoids false PiP on load). */
export function shouldAllowPipEnter(armed: boolean, signal: PipVisibilitySignal): boolean {
  return signal === "enter" && armed;
}

export function pipVisibilitySignal(inPip: boolean, intersectionRatio: number): PipVisibilitySignal {
  if (!inPip) {
    if (intersectionRatio < PIP_ENTER_VISIBLE_RATIO) return "enter";
    if (intersectionRatio >= PIP_ENTER_CANCEL_RATIO) return "cancel_enter";
    return "hold";
  }
  if (intersectionRatio >= PIP_EXIT_VISIBLE_RATIO) return "exit";
  return "cancel_exit";
}

const ARTIFACT_YOUTUBE_PIP_SS_PREFIX = "yb_artifact_youtube_pip_v1:";
const ARTIFACT_YOUTUBE_PLAYBACK_SS_PREFIX = "yb_artifact_playback_v1:";

export type ArtifactPipLayout = { left: number; top: number; width: number };

/** Viewport-fixed shell box while the in-flow slot is visible (PiP-capable layouts). */
export type ArtifactPlayerShellRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function pipSessionKey(artifactId: string) {
  return `${ARTIFACT_YOUTUBE_PIP_SS_PREFIX}${artifactId}`;
}

function playbackSessionKey(artifactId: string) {
  return `${ARTIFACT_YOUTUBE_PLAYBACK_SS_PREFIX}${artifactId}`;
}

/** Last playback position (seconds) for resume after tab switch or reload. */
export function readPlaybackSecondsFromSession(artifactId: string): number | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(playbackSessionKey(artifactId));
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

export function writePlaybackSecondsToSession(artifactId: string, seconds: number) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(playbackSessionKey(artifactId), String(Math.max(0, Math.floor(seconds))));
  } catch {
    /* ignore */
  }
}

export function pipTotalHeightPx(videoWidth: number) {
  return PIP_HEADER_PX + (videoWidth * 9) / 16;
}

export function readPipLayoutFromSession(artifactId: string): ArtifactPipLayout | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(pipSessionKey(artifactId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ArtifactPipLayout>;
    if (
      typeof parsed.left !== "number" ||
      typeof parsed.top !== "number" ||
      typeof parsed.width !== "number" ||
      !Number.isFinite(parsed.left) ||
      !Number.isFinite(parsed.top) ||
      !Number.isFinite(parsed.width)
    ) {
      return null;
    }
    return { left: parsed.left, top: parsed.top, width: parsed.width };
  } catch {
    return null;
  }
}

export function writePipLayoutToSession(artifactId: string, layout: ArtifactPipLayout) {
  try {
    sessionStorage.setItem(pipSessionKey(artifactId), JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function defaultArtifactPipLayout(): ArtifactPipLayout {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const w = Math.min(380, PIP_MAX_W, vw - PIP_VIEWPORT_PAD * 2);
  const width = Math.max(PIP_MIN_W, w);
  return {
    left: Math.max(PIP_VIEWPORT_PAD, vw - width - PIP_VIEWPORT_PAD),
    top: PIP_VIEWPORT_PAD,
    width,
  };
}

export function maxPipVideoWidthForTopLeft(left: number, top: number): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const byRight = vw - left - PIP_VIEWPORT_PAD;
  const videoMaxH = vh - top - PIP_VIEWPORT_PAD - PIP_HEADER_PX;
  const byBottom = videoMaxH > 0 ? (videoMaxH * 16) / 9 : PIP_MIN_W;
  return Math.floor(Math.min(PIP_MAX_W, byRight, byBottom, vw - PIP_VIEWPORT_PAD * 2));
}

export function clampArtifactPipLayout(layout: ArtifactPipLayout): ArtifactPipLayout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let width = Math.min(Math.max(layout.width, PIP_MIN_W), PIP_MAX_W);
  const maxW = maxPipVideoWidthForTopLeft(layout.left, layout.top);
  width = Math.min(width, Math.max(PIP_MIN_W, maxW));
  const totalH = pipTotalHeightPx(width);
  let left = layout.left;
  let top = layout.top;
  left = Math.min(Math.max(PIP_VIEWPORT_PAD, left), vw - width - PIP_VIEWPORT_PAD);
  top = Math.min(Math.max(PIP_VIEWPORT_PAD, top), vh - totalH - PIP_VIEWPORT_PAD);
  return { left, top, width };
}
