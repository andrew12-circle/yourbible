import { describe, expect, it } from "vitest";
import { getYouTubeEmbedUrl, getYouTubeVideoId } from "./youtube";

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
});

describe("getYouTubeEmbedUrl", () => {
  it("returns an embed URL for valid youtu.be input", () => {
    const embed = getYouTubeEmbedUrl("https://youtu.be/KSsdJhtL--o?si=1VVa8Eo6NjnKs1kw");
    expect(embed).toContain("https://www.youtube.com/embed/KSsdJhtL--o");
    expect(embed).toContain("enablejsapi=1");
  });
});
