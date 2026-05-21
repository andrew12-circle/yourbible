import { describe, expect, it } from "vitest";
import {
  cleanTranscriptQuoteForDisplay,
  countTimedTranscriptLines,
  formatBracketTimestamp,
  looksLikeYoutubeShowTranscriptPaste,
  needsTranscriptNormalization,
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

describe("needsTranscriptNormalization", () => {
  it("detects mashed YouTube paste", () => {
    expect(needsTranscriptNormalization("0:2222 secondsand this is Dr. Francis Miles.")).toBe(true);
  });

  it("is false for already-normalized text", () => {
    expect(needsTranscriptNormalization("[0:22] and this is Dr. Francis Miles.")).toBe(false);
  });

  it("is false for empty text", () => {
    expect(needsTranscriptNormalization("   ")).toBe(false);
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

  it("fixes 2:032 minutes, 3 seconds mashed cue (plural minutes)", () => {
    const input = "2:032 minutes, 3 secondsYou ride them hard";
    expect(normalizePastedTranscript(input)).toBe("[2:03] You ride them hard");
  });

  it("fixes 2:092 minutes, 9 seconds mashed cue", () => {
    const input = "2:092 minutes, 9 secondsMore text here";
    expect(normalizePastedTranscript(input)).toBe("[2:09] More text here");
  });

  it("fixes mashed cues after bracket lines (post 1:59 paste)", () => {
    const input = "[1:59] Earlier line\n2:032 minutes, 3 secondsYou ride them hard";
    const out = normalizePastedTranscript(input);
    expect(out).toContain("[1:59] Earlier line");
    expect(out).toContain("[2:03] You ride them hard");
    expect(countTimedTranscriptLines(out)).toBe(2);
  });

  it("fixes 1:52:471 hour, 52 minutes, 47 seconds mashed cue", () => {
    const input = "1:52:471 hour, 52 minutes, 47 secondsAnd then he said this.";
    expect(normalizePastedTranscript(input)).toBe("[1:52:47] And then he said this.");
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

describe("cleanTranscriptQuoteForDisplay", () => {
  it("returns quote body without mashed timestamp prefix", () => {
    const raw = "1:52:471 hour, 52 minutes, 47 secondsAnd then he said this.";
    expect(cleanTranscriptQuoteForDisplay(raw)).toBe("And then he said this.");
  });

  it("strips bracket timestamp from normalized lines", () => {
    expect(cleanTranscriptQuoteForDisplay("[1:52:47] And then he said this.")).toBe("And then he said this.");
  });
});
