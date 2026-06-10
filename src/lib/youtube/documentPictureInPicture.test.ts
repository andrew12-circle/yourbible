import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeYouTubeDocumentPip,
  findYouTubeStaticShell,
  insertDocumentPipPlaceholder,
  isDocumentPictureInPictureSupported,
  restoreShellToPlaceholder,
  youtubeDocumentPipActiveRef,
  youtubeDocumentPipWindowRef,
} from "./documentPictureInPicture";

describe("documentPictureInPicture", () => {
  afterEach(() => {
    youtubeDocumentPipActiveRef.current = false;
    youtubeDocumentPipWindowRef.current = null;
    delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture;
  });

  it("detects Document PiP support", () => {
    expect(isDocumentPictureInPictureSupported()).toBe(false);
    (window as Window & { documentPictureInPicture?: object }).documentPictureInPicture = {};
    expect(isDocumentPictureInPictureSupported()).toBe(true);
  });

  it("finds static shell in a root node", () => {
    const root = document.createElement("div");
    const shell = document.createElement("div");
    shell.setAttribute("data-youtube-static-shell", "true");
    root.appendChild(shell);
    expect(findYouTubeStaticShell(root)).toBe(shell);
    expect(findYouTubeStaticShell(document.createElement("div"))).toBeNull();
  });

  it("inserts placeholder and restores shell", () => {
    const parent = document.createElement("div");
    const shell = document.createElement("div");
    shell.textContent = "player";
    parent.appendChild(shell);

    const placeholder = insertDocumentPipPlaceholder(shell);
    expect(parent.contains(placeholder)).toBe(true);
    expect(parent.contains(shell)).toBe(true);
    expect(placeholder.nextSibling).toBe(shell);

    parent.removeChild(shell);
    restoreShellToPlaceholder(shell, placeholder);
    expect(parent.contains(shell)).toBe(true);
    expect(parent.querySelector("[data-youtube-doc-pip-placeholder]")).toBeNull();
  });

  it("closeYouTubeDocumentPip restores shell and clears refs", () => {
    const parent = document.createElement("div");
    const shell = document.createElement("div");
    parent.appendChild(shell);
    const placeholder = insertDocumentPipPlaceholder(shell);
    const pipWindow = {
      closed: false,
      close: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window;

    youtubeDocumentPipActiveRef.current = true;
    youtubeDocumentPipWindowRef.current = pipWindow;

    const session = {
      pipWindow,
      shell,
      placeholder,
      onPageHide: vi.fn(),
      onPipClick: vi.fn(),
    };

    closeYouTubeDocumentPip(session);

    expect(parent.contains(shell)).toBe(true);
    expect(youtubeDocumentPipActiveRef.current).toBe(false);
    expect(youtubeDocumentPipWindowRef.current).toBeNull();
    expect(pipWindow.close).toHaveBeenCalled();
  });
});
