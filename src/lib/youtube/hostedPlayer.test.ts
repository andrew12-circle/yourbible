import { describe, expect, it } from "vitest";
import { buildYouTubeEmbedSrc, postYouTubeEmbedCommand } from "./embed";
import { isMessageFromYouTubeFrame, youtubeFrameTargetOrigin } from "./embedMessaging";
import { DEFAULT_YOUTUBE_HOST_ORIGIN } from "./hostOrigin";

describe("identified YouTube embeds", () => {
  it.each(["capacitor://localhost", "null", "file:///"])("uses a real HTTPS document for %s", (origin) => {
    const url = new URL(buildYouTubeEmbedSrc("HbLhpMEmrqU", 38, { origin }));
    expect(url.origin).toBe(DEFAULT_YOUTUBE_HOST_ORIGIN);
    expect(url.pathname).toBe("/youtube-player.html");
    expect(url.searchParams.get("v")).toBe("HbLhpMEmrqU");
    expect(url.searchParams.get("start")).toBe("38");
    expect(url.searchParams.get("origin")).toBe(DEFAULT_YOUTUBE_HOST_ORIGIN);
  });
  it("keeps ordinary HTTPS embeds direct and strips tokens from widget referrers", () => {
    const url = new URL(buildYouTubeEmbedSrc("HbLhpMEmrqU", 0, { origin: "https://bible.example", widgetReferrer: "https://bible.example/artifacts/one?access_token=secret#private" }));
    expect(url.origin).toBe("https://www.youtube.com");
    expect(url.searchParams.get("origin")).toBe("https://bible.example");
    expect(url.searchParams.get("widget_referrer")).toBe("https://bible.example/artifacts/one");
    expect(url.href).not.toContain("secret");
  });
  it("preserves live-edge playback and rejects invalid video identifiers", () => {
    expect(new URL(buildYouTubeEmbedSrc("HbLhpMEmrqU", 300, { origin: "capacitor://localhost", liveEdge: true })).searchParams.has("start")).toBe(false);
    expect(() => buildYouTubeEmbedSrc("../other")).toThrow("Invalid");
    expect(buildYouTubeEmbedSrc("HbLhpMEmrqU", NaN)).not.toContain("NaN");
  });
  it("requires both the real frame origin and its source window", () => {
    const frame = document.createElement("iframe"); frame.src = DEFAULT_YOUTUBE_HOST_ORIGIN + "/youtube-player.html?v=HbLhpMEmrqU";
    document.body.appendChild(frame);
    expect(isMessageFromYouTubeFrame({ source: frame.contentWindow, origin: DEFAULT_YOUTUBE_HOST_ORIGIN }, frame)).toBe(true);
    expect(isMessageFromYouTubeFrame({ source: window, origin: DEFAULT_YOUTUBE_HOST_ORIGIN }, frame)).toBe(false);
    expect(isMessageFromYouTubeFrame({ source: frame.contentWindow, origin: "https://evil.example" }, frame)).toBe(false);
    expect(youtubeFrameTargetOrigin(frame)).toBe(DEFAULT_YOUTUBE_HOST_ORIGIN);
    frame.remove();
  });
  it("does not address a hosted control command to youtube.com", () => {
    const frame = document.createElement("iframe"); frame.src = DEFAULT_YOUTUBE_HOST_ORIGIN + "/youtube-player.html?v=HbLhpMEmrqU";
    document.body.appendChild(frame);
    const sent: unknown[][] = []; frame.contentWindow!.postMessage = (...args: unknown[]) => { sent.push(args); };
    postYouTubeEmbedCommand(frame, "seekTo", [45]);
    expect(sent).toEqual([[JSON.stringify({ event: "command", func: "seekTo", args: [45] }), DEFAULT_YOUTUBE_HOST_ORIGIN]]);
    frame.remove();
  });
});
