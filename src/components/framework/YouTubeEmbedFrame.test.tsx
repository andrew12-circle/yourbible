import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import YouTubeEmbedFrame from "./YouTubeEmbedFrame";
afterEach(cleanup);
const src = "https://www.youtube.com/embed/HbLhpMEmrqU?start=12&autoplay=0";
function send(frame: HTMLIFrameElement, data: object, origin = new URL(frame.src).origin, source: Window | null = frame.contentWindow) {
  act(() => window.dispatchEvent(new MessageEvent("message", { origin, source, data: JSON.stringify(data) })));
}
describe("YouTube Error 153 recovery", () => {
  it("retries once with the same video and last observed playhead", () => {
    const { container } = render(<YouTubeEmbedFrame src={src} />);
    const frame = container.querySelector("iframe")!;
    send(frame, { event: "infoDelivery", info: { currentTime: 91 } });
    send(frame, { event: "onError", info: 153 });
    expect(frame.src).toContain("/youtube-player.html?");
    expect(new URL(frame.src).searchParams.get("start")).toBe("91");
    const retried = frame.src;
    send(frame, { event: "onError", info: 153 });
    expect(frame.src).toBe(retried);
  });
  it("ignores spoofed errors and does not retry embed restrictions", () => {
    const { container } = render(<YouTubeEmbedFrame src={src} />);
    const frame = container.querySelector("iframe")!;
    send(frame, { event: "onError", info: 153 }, "https://evil.example");
    send(frame, { event: "onError", info: 153 }, "https://www.youtube.com", window);
    send(frame, { event: "onError", info: 101 });
    expect(frame.src).toBe(src);
  });
  it("does not remount on layout changes and clears recovery for a different source", () => {
    const { container, rerender } = render(<YouTubeEmbedFrame src={src} className="inline" />);
    const frame = container.querySelector("iframe")!;
    send(frame, { event: "onError", info: 153 });
    rerender(<YouTubeEmbedFrame src={src} className="pip" />);
    expect(container.querySelector("iframe")).toBe(frame);
    expect(frame.src).toContain("youtube-player.html");
    rerender(<YouTubeEmbedFrame src="https://www.youtube.com/embed/dQw4w9WgXcQ" />);
    expect(frame.src).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });
});
