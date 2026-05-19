import { describe, expect, it } from "vitest";
import {
  countTimedTranscriptLines,
  formatBracketTimestamp,
  looksLikeYoutubeShowTranscriptPaste,
  normalizePastedTranscript,
} from "./normalizePastedTranscript";

describe("formatBracketTimestamp", () => {
  it("formats under one hour as M:SS", () => {
    expect(formatBracketTimestamp(22)).toBe("0:22");
    expect(formatBracketTimestamp(63)).toBe("1:03");
  });

  it("formats one hour or more as H:MM:SS", () => {
    expect(formatBracketTimestamp(3661)).toBe("1:01:01");
  });
});

describe("looksLikeYoutubeShowTranscriptPaste", () => {
  it("detects mashed seconds pattern", () => {
    expect(looksLikeYoutubeShowTranscriptPaste("0:2222 secondsand this")).toBe(true);
  });

  it("ignores clean bracket transcripts", () => {
    expect(looksLikeYoutubeShowTranscriptPaste("[0:22] Hello")).toBe(false);
  });
});

describe("normalizePastedTranscript", () => {
  it("fixes 0:2222 seconds mashed cue", () => {
    const input = "0:2222 secondsand this is Dr. Francis Miles";
    expect(normalizePastedTranscript(input)).toBe("[0:22] and this is Dr. Francis Miles");
  });

  it("fixes 0:2727 seconds mashed cue", () => {
    const input = "0:2727 secondsUh, I think for the people";
    expect(normalizePastedTranscript(input)).toBe("[0:27] Uh, I think for the people");
  });

  it("fixes 1:031 minute, 3 seconds mashed cue", () => {
    const input = "1:031 minute, 3 secondsyou're going to be learning";
    expect(normalizePastedTranscript(input)).toBe("[1:03] you're going to be learning");
  });

  it("leaves already-bracketed lines unchanged (aside from whitespace)", () => {
    const input = "[0:22]   already   clean";
    expect(normalizePastedTranscript(input)).toBe("[0:22] already clean");
  });

  it("normalizes multiple mashed cues on separate lines", () => {
    const input = [
      "0:2222 secondsFirst line.",
      "0:2727 secondsSecond line.",
    ].join("\n");
    const out = normalizePastedTranscript(input);
    expect(out).toContain("[0:22] First line.");
    expect(out).toContain("[0:27] Second line.");
    expect(countTimedTranscriptLines(out)).toBe(2);
  });

  it("merges newline-separated YouTube UI blocks", () => {
    const input = "0:22\n22 seconds\nand this is Dr. Francis Miles";
    expect(normalizePastedTranscript(input)).toBe("[0:22] and this is Dr. Francis Miles");
  });

  it("preserves paragraph breaks", () => {
    const input = "[0:00] Intro\n\n[0:30] Body";
    expect(normalizePastedTranscript(input)).toBe("[0:00] Intro\n\n[0:30] Body");
  });

  it("is idempotent on normalized output", () => {
    const once = normalizePastedTranscript("0:2222 secondsHello world.");
    const twice = normalizePastedTranscript(once);
    expect(twice).toBe(once);
  });
});
