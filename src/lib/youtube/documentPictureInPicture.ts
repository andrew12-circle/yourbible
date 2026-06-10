/** Document Picture-in-Picture (Chrome/Edge desktop) — OS-level floating window. */

export const YOUTUBE_STATIC_SHELL_SELECTOR = "[data-youtube-static-shell]";
export const YOUTUBE_DOC_PIP_PLACEHOLDER_ATTR = "data-youtube-doc-pip-placeholder";

/** Shared flag so visibility handlers skip resume while OS PiP owns the iframe. */
export const youtubeDocumentPipActiveRef = { current: false };

/** PiP window document — iframe moves here while popped out. */
export const youtubeDocumentPipWindowRef: { current: Window | null } = { current: null };

export function isDocumentPictureInPictureSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

export function findYouTubeStaticShell(root: ParentNode | null): HTMLElement | null {
  const el = root?.querySelector(YOUTUBE_STATIC_SHELL_SELECTOR);
  return el instanceof HTMLElement ? el : null;
}

export function insertDocumentPipPlaceholder(shell: HTMLElement): HTMLElement {
  const placeholder = document.createElement("div");
  placeholder.setAttribute(YOUTUBE_DOC_PIP_PLACEHOLDER_ATTR, "true");
  placeholder.style.display = "none";
  shell.parentNode?.insertBefore(placeholder, shell);
  return placeholder;
}

export function restoreShellToPlaceholder(shell: HTMLElement, placeholder: HTMLElement): void {
  if (placeholder.parentNode) {
    placeholder.parentNode.insertBefore(shell, placeholder);
  }
  placeholder.remove();
}

export function styleDocumentPipWindow(pipWindow: Window): void {
  const doc = pipWindow.document;
  doc.body.style.margin = "0";
  doc.body.style.padding = "0";
  doc.body.style.overflow = "hidden";
  doc.body.style.background = "#000";
}

export function styleShellForDocumentPip(shell: HTMLElement): void {
  shell.style.position = "absolute";
  shell.style.inset = "0";
  shell.style.width = "100%";
  shell.style.height = "100%";
  shell.style.margin = "0";
}

export type DocumentPipSession = {
  pipWindow: Window;
  shell: HTMLElement;
  placeholder: HTMLElement;
  onPageHide: () => void;
  onPipClick: () => void;
};

export async function openYouTubeDocumentPip(options: {
  shell: HTMLElement;
  width: number;
  height: number;
  onClose: () => void;
}): Promise<DocumentPipSession | null> {
  if (!isDocumentPictureInPictureSupported()) return null;

  const { shell, width, height, onClose } = options;
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

  styleDocumentPipWindow(pipWindow);
  const placeholder = insertDocumentPipPlaceholder(shell);
  styleShellForDocumentPip(shell);
  pipWindow.document.body.appendChild(shell);

  const session: DocumentPipSession = {
    pipWindow,
    shell,
    placeholder,
    onPageHide: () => {},
    onPipClick: () => {
      window.focus();
    },
  };

  session.onPageHide = () => {
    closeYouTubeDocumentPip(session);
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

  const { pipWindow, shell, placeholder, onPageHide, onPipClick } = session;
  pipWindow.removeEventListener("pagehide", onPageHide);
  pipWindow.removeEventListener("click", onPipClick);

  if (placeholder.isConnected) {
    restoreShellToPlaceholder(shell, placeholder);
  }

  shell.style.position = "";
  shell.style.inset = "";
  shell.style.width = "";
  shell.style.height = "";
  shell.style.margin = "";

  youtubeDocumentPipActiveRef.current = false;
  youtubeDocumentPipWindowRef.current = null;

  try {
    if (!pipWindow.closed) pipWindow.close();
  } catch {
    /* ignore */
  }
}
