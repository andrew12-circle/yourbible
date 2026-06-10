/** Document Picture-in-Picture (Chrome/Edge desktop) — OS-level floating window. */

export const YOUTUBE_STATIC_SHELL_SELECTOR = "[data-youtube-static-shell]";
export const YOUTUBE_DOC_PIP_SHELL_ATTR = "data-youtube-doc-pip-shell";

/** Shared flag so visibility handlers skip resume while OS PiP owns the iframe. */
export const youtubeDocumentPipActiveRef = { current: false };

/** PiP window document — iframe lives here while popped out. */
export const youtubeDocumentPipWindowRef: { current: Window | null } = { current: null };

export function isDocumentPictureInPictureSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

export function findYouTubeStaticShell(root: ParentNode | null): HTMLElement | null {
  const el = root?.querySelector(`${YOUTUBE_STATIC_SHELL_SELECTOR}:not([${YOUTUBE_DOC_PIP_SHELL_ATTR}])`);
  return el instanceof HTMLElement ? el : null;
}

/** PiP document needs page referrer context — moving an iframe triggers YouTube error 153. */
export function configureDocumentPipDocument(pipWindow: Window, pageUrl: string): void {
  const doc = pipWindow.document;
  doc.head.replaceChildren();

  const referrer = doc.createElement("meta");
  referrer.name = "referrer";
  referrer.content = "strict-origin-when-cross-origin";
  doc.head.appendChild(referrer);

  const base = doc.createElement("base");
  base.href = pageUrl;
  doc.head.appendChild(base);

  doc.body.style.margin = "0";
  doc.body.style.padding = "0";
  doc.body.style.overflow = "hidden";
  doc.body.style.background = "#000";
}

export function hideInlineShellForDocumentPip(shell: HTMLElement): void {
  shell.style.visibility = "hidden";
  shell.style.pointerEvents = "none";
}

export function showInlineShellAfterDocumentPip(shell: HTMLElement): void {
  shell.style.visibility = "";
  shell.style.pointerEvents = "";
}

export function createDocumentPipEmbedShell(
  pipWindow: Window,
  embedSrc: string,
  title = "YouTube video",
): { shell: HTMLElement; iframe: HTMLIFrameElement } {
  const shell = pipWindow.document.createElement("div");
  shell.setAttribute("data-youtube-static-shell", "true");
  shell.setAttribute(YOUTUBE_DOC_PIP_SHELL_ATTR, "true");
  Object.assign(shell.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    margin: "0",
    overflow: "hidden",
    background: "#000",
  });

  const iframe = pipWindow.document.createElement("iframe");
  iframe.setAttribute("data-youtube-static-embed", "true");
  iframe.src = embedSrc;
  iframe.title = title;
  iframe.className = "h-full w-full border-0 bg-black";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  shell.appendChild(iframe);
  pipWindow.document.body.appendChild(shell);

  return { shell, iframe };
}

export type DocumentPipSession = {
  pipWindow: Window;
  inlineShell: HTMLElement;
  pipShell: HTMLElement;
  onPageHide: () => void;
  onPipClick: () => void;
};

export async function openYouTubeDocumentPip(options: {
  inlineShell: HTMLElement;
  embedSrc: string;
  pageUrl: string;
  width: number;
  height: number;
  title?: string;
  onClose: () => void;
}): Promise<DocumentPipSession | null> {
  if (!isDocumentPictureInPictureSupported()) return null;

  const { inlineShell, embedSrc, pageUrl, width, height, title, onClose } = options;
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

  configureDocumentPipDocument(pipWindow, pageUrl);
  hideInlineShellForDocumentPip(inlineShell);
  const { shell: pipShell } = createDocumentPipEmbedShell(pipWindow, embedSrc, title);

  const session: DocumentPipSession = {
    pipWindow,
    inlineShell,
    pipShell,
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

  return session;
}

export function closeYouTubeDocumentPip(session: DocumentPipSession | null): void {
  if (!session || !youtubeDocumentPipActiveRef.current) return;

  const { pipWindow, inlineShell, pipShell, onPageHide, onPipClick } = session;
  pipWindow.removeEventListener("pagehide", onPageHide);
  pipWindow.removeEventListener("click", onPipClick);

  pipShell.remove();
  showInlineShellAfterDocumentPip(inlineShell);

  youtubeDocumentPipActiveRef.current = false;
  youtubeDocumentPipWindowRef.current = null;

  try {
    if (!pipWindow.closed) pipWindow.close();
  } catch {
    /* ignore */
  }
}
