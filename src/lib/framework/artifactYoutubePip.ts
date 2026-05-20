/** Chrome overlays the video; no dedicated header band in layout math. */
export const PIP_HEADER_PX = 0;
export const PIP_MIN_W = 160;
export const PIP_MAX_W = 640;
export const PIP_VIEWPORT_PAD = 8;

/** Below this visible ratio (in scroll root), enter picture-in-picture. */
export const PIP_ENTER_VISIBLE_RATIO = 0.1;
/** Above this visible ratio, restore the in-flow player. */
export const PIP_EXIT_VISIBLE_RATIO = 0.5;
export const PIP_ENTER_DELAY_MS = 100;
export const PIP_EXIT_DELAY_MS = 150;
export const PIP_IO_THRESHOLDS = [0, 0.1, 0.25, 0.5, 0.75, 1] as const;

export type PipVisibilitySignal = "enter" | "exit" | "cancel_enter" | "cancel_exit" | "hold";

/** Hysteresis: stay in PIP between enter/exit ratios until debounced transition completes. */
export function pipVisibilitySignal(inPip: boolean, intersectionRatio: number): PipVisibilitySignal {
  if (!inPip) {
    if (intersectionRatio < PIP_ENTER_VISIBLE_RATIO) return "enter";
    return intersectionRatio >= PIP_ENTER_VISIBLE_RATIO ? "cancel_enter" : "hold";
  }
  if (intersectionRatio > PIP_EXIT_VISIBLE_RATIO) return "exit";
  return intersectionRatio <= PIP_EXIT_VISIBLE_RATIO ? "cancel_exit" : "hold";
}

const ARTIFACT_YOUTUBE_PIP_SS_PREFIX = "yb_artifact_youtube_pip_v1:";

export type ArtifactPipLayout = { left: number; top: number; width: number };

function pipSessionKey(artifactId: string) {
  return `${ARTIFACT_YOUTUBE_PIP_SS_PREFIX}${artifactId}`;
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
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = Math.min(300, PIP_MAX_W, vw - PIP_VIEWPORT_PAD * 2);
  const width = Math.max(PIP_MIN_W, w);
  const totalH = pipTotalHeightPx(width);
  return {
    left: Math.max(PIP_VIEWPORT_PAD, vw - width - PIP_VIEWPORT_PAD),
    top: Math.max(PIP_VIEWPORT_PAD, vh - totalH - PIP_VIEWPORT_PAD),
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
