import { describe, expect, it } from "vitest";
import {
  canonicalYouTubeWatchUrl,
  extractYouTubeUrlFromText,
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
  resolveYouTubeVideoId,
} from "./youtube";

describe("getYouTubeVideoId", () => {
  it("parses youtu.be links with si query params", () => {
    expect(getYouTubeVideoId("https://youtu.be/KSsdJhtL--o?si=1VVa8Eo6NjnKs1kw")).toBe("KSsdJhtL--o");
  });

  it("parses watch URLs with si query params", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=KSsdJhtL--o&si=1VVa8Eo6NjnKs1kw")).toBe(
      "KSsdJhtL--o",
    );
  });

  it("adds https when the scheme is omitted", () => {
    expect(getYouTubeVideoId("youtu.be/KSsdJhtL--o?si=abc")).toBe("KSsdJhtL--o");
  });

  it("parses shorts URLs", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ?si=xyz")).toBe("dQw4w9WgXcQ");
  });

  it("rejects non-YouTube hosts", () => {
    expect(getYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("resolves from metadata when the stored URL lacks a video id", () => {
    expect(resolveYouTubeVideoId("https://www.youtube.com/@channel", { video_id: "dQw4w9WgXcQ" })).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("builds a canonical watch URL", () => {
    expect(canonicalYouTubeWatchUrl("dQw4w9WgXcQ", "youtu.be/dQw4w9WgXcQ")).toBe(
      "https://youtu.be/dQw4w9WgXcQ",
    );
  });
});

describe("extractYouTubeUrlFromText", () => {
  it("accepts a bare YouTube URL", () => {
    expect(extractYouTubeUrlFromText("https://youtu.be/KSsdJhtL--o?si=abc")).toBe(
      "https://youtu.be/KSsdJhtL--o?si=abc",
    );
  });

  it("finds a URL embedded in share text", () => {
    expect(
      extractYouTubeUrlFromText("Check this out https://www.youtube.com/watch?v=dQw4w9WgXcQ thanks!"),
    ).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("returns null for unrelated clipboard text", () => {
    expect(extractYouTubeUrlFromText("hello world")).toBeNull();
  });
});

describe("getYouTubeEmbedUrl", () => {
  it("returns an embed URL for valid youtu.be input", () => {
    const embed = getYouTubeEmbedUrl("https://youtu.be/KSsdJhtL--o?si=1VVa8Eo6NjnKs1kw");
    expect(embed).toContain("https://www.youtube-nocookie.com/embed/KSsdJhtL--o");
    expect(embed).toContain("rel=0");
  });
});
