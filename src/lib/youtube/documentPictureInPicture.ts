/** Document Picture-in-Picture (Chrome/Edge desktop) — OS-level floating window. */

export const YOUTUBE_STATIC_SHELL_SELECTOR = "[data-youtube-static-shell]";
export const YOUTUBE_DOC_PIP_SHELL_ATTR = "data-youtube-doc-pip-shell";
export const ARTIFACT_VIDEO_POPOUT_PATH = "/artifact-video-popout.html";
export const ARTIFACT_VIDEO_POPOUT_MESSAGE = "yb-artifact-video-popout";

/** Shared flag so visibility handlers skip resume while OS PiP owns the iframe. */
export const youtubeDocumentPipActiveRef = { current: false };

/** PiP window document — popout page loads here while popped out. */
export const youtubeDocumentPipWindowRef: { current: Window | null } = { current: null };

export function isDocumentPictureInPictureSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

export function findYouTubeStaticShell(root: ParentNode | null): HTMLElement | null {
  const el = root?.querySelector(`${YOUTUBE_STATIC_SHELL_SELECTOR}:not([${YOUTUBE_DOC_PIP_SHELL_ATTR}])`);
  return el instanceof HTMLElement ? el : null;
}

export function buildArtifactVideoPopoutUrl(options: {
  videoId: string;
  startSeconds: number;
  autoplay: boolean;
  widgetReferrer: string;
  openerOrigin?: string;
}): string {
  const url = new URL(ARTIFACT_VIDEO_POPOUT_PATH, window.location.origin);
  url.searchParams.set("v", options.videoId);
  url.searchParams.set("t", String(Math.max(0, Math.floor(options.startSeconds))));
  if (options.autoplay) url.searchParams.set("ap", "1");
  url.searchParams.set("wr", options.widgetReferrer);
  url.searchParams.set("oo", options.openerOrigin ?? window.location.origin);
  return url.toString();
}

export function hideInlineShellForDocumentPip(shell: HTMLElement): void {
  shell.style.visibility = "hidden";
  shell.style.pointerEvents = "none";
}

export function showInlineShellAfterDocumentPip(shell: HTMLElement): void {
  shell.style.visibility = "";
  shell.style.pointerEvents = "";
}

export type DocumentPipSession = {
  pipWindow: Window;
  inlineShell: HTMLElement;
  onPageHide: () => void;
  onPipClick: () => void;
};

export async function openYouTubeDocumentPip(options: {
  inlineShell: HTMLElement;
  videoId: string;
  startSeconds: number;
  autoplay: boolean;
  pageUrl: string;
  width: number;
  height: number;
  onClose: () => void;
}): Promise<DocumentPipSession | null> {
  if (!isDocumentPictureInPictureSupported()) return null;

  const { inlineShell, videoId, startSeconds, autoplay, pageUrl, width, height, onClose } = options;
  const docPip = window.documentPictureInPicture;
  if (!docPip) return null;

  const w = Math.max(200, Math.round(width));
  const h = Math.max(120, Math.round(height));

  let pipWindow: Window;
  try {
    pipWindow = await docPip.requestWindow({ width: w, height: h });
  } catch {
    return null;
  }

  hideInlineShellForDocumentPip(inlineShell);

  const session: DocumentPipSession = {
    pipWindow,
    inlineShell,
    onPageHide: () => {},
    onPipClick: () => {
      window.focus();
    },
  };

  session.onPageHide = () => {
    onClose();
  };

  pipWindow.addEventListener("pagehide", session.onPageHide);
  pipWindow.addEventListener("click", session.onPipClick);

  youtubeDocumentPipActiveRef.current = true;
  youtubeDocumentPipWindowRef.current = pipWindow;

  const popoutUrl = buildArtifactVideoPopoutUrl({
    videoId,
    startSeconds,
    autoplay,
    widgetReferrer: pageUrl,
  });
  pipWindow.location.href = popoutUrl;

  return session;
}

export function closeYouTubeDocumentPip(session: DocumentPipSession | null): void {
  if (!session || !youtubeDocumentPipActiveRef.current) return;

  const { pipWindow, inlineShell, onPageHide, onPipClick } = session;
  pipWindow.removeEventListener("pagehide", onPageHide);
  pipWindow.removeEventListener("click", onPipClick);

  showInlineShellAfterDocumentPip(inlineShell);

  youtubeDocumentPipActiveRef.current = false;
  youtubeDocumentPipWindowRef.current = null;

  try {
    if (!pipWindow.closed) pipWindow.close();
  } catch {
    /* ignore */
  }
}

export type ArtifactVideoPopoutMessage = {
  type: typeof ARTIFACT_VIDEO_POPOUT_MESSAGE;
  seconds: number;
  playing: boolean;
  closing?: boolean;
};

export function isArtifactVideoPopoutMessage(
  data: unknown,
  expectedOrigin: string,
  eventOrigin: string,
): data is ArtifactVideoPopoutMessage {
  if (eventOrigin !== expectedOrigin) return false;
  if (!data || typeof data !== "object") return false;
  const msg = data as Partial<ArtifactVideoPopoutMessage>;
  return (
    msg.type === ARTIFACT_VIDEO_POPOUT_MESSAGE &&
    typeof msg.seconds === "number" &&
    typeof msg.playing === "boolean"
  );
}
