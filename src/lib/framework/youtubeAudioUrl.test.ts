import { describe, expect, it } from "vitest";
import { pickBestDirectAudioUrl } from "../../../supabase/functions/_shared/youtubeAudioUrl.ts";

describe("pickBestDirectAudioUrl", () => {
  it("picks highest-bitrate audio-only direct URL", () => {
    const url = pickBestDirectAudioUrl([
      { mimeType: "video/mp4", url: "https://example.com/v.mp4", bitrate: 9_000_000 },
      { mimeType: "audio/mp4", url: "https://example.com/a-low.mp4", bitrate: 64_000 },
      { mimeType: "audio/webm", url: "https://example.com/a-high.webm", bitrate: 160_000 },
      { mimeType: "audio/mp4", signatureCipher: "s=...", url: "https://example.com/cipher.mp4", bitrate: 200_000 },
    ]);
    expect(url).toBe("https://example.com/a-high.webm");
  });

  it("returns null when only ciphered or non-audio formats exist", () => {
    expect(
      pickBestDirectAudioUrl([
        { mimeType: "video/mp4", url: "https://example.com/v.mp4" },
        { mimeType: "audio/mp4", signatureCipher: "x", url: "https://example.com/c.mp4" },
      ]),
    ).toBeNull();
  });
});
