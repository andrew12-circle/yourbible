import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ARTIFACT_VIDEO_POPOUT_PATH,
  buildArtifactVideoPopoutUrl,
  closeYouTubeDocumentPip,
  findYouTubeStaticShell,
  hideInlineShellForDocumentPip,
  isArtifactVideoPopoutMessage,
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

  it("builds same-origin popout URL with widget referrer", () => {
    const url = buildArtifactVideoPopoutUrl({
      videoId: "abc123",
      startSeconds: 42,
      autoplay: true,
      widgetReferrer: "https://example.com/artifacts/1",
      openerOrigin: "https://example.com",
    });
    expect(url).toContain(ARTIFACT_VIDEO_POPOUT_PATH);
    expect(url).toContain("v=abc123");
    expect(url).toContain("t=42");
    expect(url).toContain("ap=1");
    expect(url).toContain(encodeURIComponent("https://example.com/artifacts/1"));
  });

  it("validates popout postMessage payloads", () => {
    expect(
      isArtifactVideoPopoutMessage(
        { type: "yb-artifact-video-popout", seconds: 10, playing: true },
        "https://example.com",
        "https://example.com",
      ),
    ).toBe(true);
    expect(
      isArtifactVideoPopoutMessage(
        { type: "other", seconds: 10, playing: true },
        "https://example.com",
        "https://example.com",
      ),
    ).toBe(false);
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
