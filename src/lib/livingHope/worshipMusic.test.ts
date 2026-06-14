import { describe, expect, it } from "vitest";
import {
  extractYouTubeVideoId,
  parseWorshipMusicUrl,
  upsertWorshipMusicHistory,
  worshipMusicEmbedHeight,
  worshipMusicFallbackThumbnail,
} from "@/lib/livingHope/worshipMusic";

describe("parseWorshipMusicUrl", () => {
  it("parses Spotify playlist links", () => {
    const result = parseWorshipMusicUrl(
      "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    );
    expect(result?.provider).toBe("spotify");
    expect(result?.embedUrl).toContain("/embed/playlist/37i9dQZF1DXcBWIGoYBM5M");
    expect(result?.openUrl).toContain("open.spotify.com/playlist/");
  });

  it("parses Apple Music playlist links", () => {
    const result = parseWorshipMusicUrl(
      "https://music.apple.com/us/playlist/top-christian/pl.u-mJxd947tFZJYpjd",
    );
    expect(result?.provider).toBe("apple");
    expect(result?.embedUrl).toContain("embed.music.apple.com/us/playlist/");
    expect(result?.openUrl).toContain("music.apple.com/us/playlist/");
  });

  it("parses YouTube playlist links", () => {
    const result = parseWorshipMusicUrl("https://www.youtube.com/playlist?list=PLabc123");
    expect(result?.provider).toBe("youtube");
    expect(result?.embedUrl).toContain("videoseries?list=PLabc123");
  });

  it("parses YouTube watch links with video id", () => {
    const result = parseWorshipMusicUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result?.provider).toBe("youtube");
    expect(result?.embedUrl).toContain("/embed/dQw4w9WgXcQ");
  });

  it("returns null for unsupported URLs", () => {
    expect(parseWorshipMusicUrl("https://example.com/playlist")).toBeNull();
    expect(parseWorshipMusicUrl("")).toBeNull();
  });
});

describe("worshipMusicEmbedHeight", () => {
  it("returns positive heights for each provider", () => {
    expect(worshipMusicEmbedHeight("spotify")).toBeGreaterThan(0);
    expect(worshipMusicEmbedHeight("apple")).toBeGreaterThan(0);
    expect(worshipMusicEmbedHeight("youtube")).toBeGreaterThan(200);
  });
});

describe("extractYouTubeVideoId", () => {
  it("reads video ids from watch and youtu.be links", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
});

describe("upsertWorshipMusicHistory", () => {
  it("dedupes links and keeps the newest entry first", () => {
    const first = upsertWorshipMusicHistory([], "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(first).toHaveLength(1);
    const second = upsertWorshipMusicHistory(first, "https://youtu.be/dQw4w9WgXcQ");
    expect(second).toHaveLength(1);
    expect(second[0]?.url).toContain("youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("builds a YouTube thumbnail fallback", () => {
    const thumb = worshipMusicFallbackThumbnail(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "youtube",
    );
    expect(thumb).toContain("dQw4w9WgXcQ");
  });
});
