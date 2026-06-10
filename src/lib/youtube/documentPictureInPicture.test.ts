import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeYouTubeDocumentPip,
  configureDocumentPipDocument,
  createDocumentPipEmbedShell,
  findYouTubeStaticShell,
  hideInlineShellForDocumentPip,
  isDocumentPictureInPictureSupported,
  showInlineShellAfterDocumentPip,
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

  it("finds inline static shell but not doc-pip shell", () => {
    const root = document.createElement("div");
    const inline = document.createElement("div");
    inline.setAttribute("data-youtube-static-shell", "true");
    const pip = document.createElement("div");
    pip.setAttribute("data-youtube-static-shell", "true");
    pip.setAttribute("data-youtube-doc-pip-shell", "true");
    root.appendChild(inline);
    root.appendChild(pip);
    expect(findYouTubeStaticShell(root)).toBe(inline);
  });

  it("configures PiP document referrer and base href", () => {
    const doc = document.implementation.createHTMLDocument("pip");
    const pipWindow = { document: doc } as unknown as Window;

    configureDocumentPipDocument(pipWindow, "https://example.com/artifacts/1");
    expect(doc.head.querySelector('meta[name="referrer"]')).not.toBeNull();
    expect(doc.head.querySelector("base")?.getAttribute("href")).toBe(
      "https://example.com/artifacts/1",
    );
  });

  it("creates a fresh embed shell in the PiP window", () => {
    const doc = document.implementation.createHTMLDocument("pip");
    const pipWindow = { document: doc } as unknown as Window;

    configureDocumentPipDocument(pipWindow, "https://example.com/artifacts/1");
    const { iframe } = createDocumentPipEmbedShell(
      pipWindow,
      "https://www.youtube.com/embed/abc?enablejsapi=1",
    );
    expect(iframe.getAttribute("data-youtube-static-embed")).toBe("true");
    expect(iframe.referrerPolicy).toBe("strict-origin-when-cross-origin");
    expect(doc.body.querySelector("[data-youtube-doc-pip-shell]")).not.toBeNull();
  });

  it("hides and shows inline shell", () => {
    const shell = document.createElement("div");
    hideInlineShellForDocumentPip(shell);
    expect(shell.style.visibility).toBe("hidden");
    showInlineShellAfterDocumentPip(shell);
    expect(shell.style.visibility).toBe("");
  });

  it("closeYouTubeDocumentPip restores inline shell and clears refs", () => {
    const inlineShell = document.createElement("div");
    const pipShell = document.createElement("div");
    hideInlineShellForDocumentPip(inlineShell);

    const pipWindow = {
      closed: false,
      close: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window;

    youtubeDocumentPipActiveRef.current = true;
    youtubeDocumentPipWindowRef.current = pipWindow;

    const session = {
      pipWindow,
      inlineShell,
      pipShell,
      onPageHide: vi.fn(),
      onPipClick: vi.fn(),
    };

    closeYouTubeDocumentPip(session);

    expect(inlineShell.style.visibility).toBe("");
    expect(youtubeDocumentPipActiveRef.current).toBe(false);
    expect(youtubeDocumentPipWindowRef.current).toBeNull();
    expect(pipWindow.close).toHaveBeenCalled();
  });
});
