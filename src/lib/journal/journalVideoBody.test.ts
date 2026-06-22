import { describe, expect, it } from "vitest";
import { insertTranscriptAtAnchor, resolveVideoAnchorOffset, effectiveVideoAnchor } from "@/lib/journal/journalVideoBody";

describe("insertTranscriptAtAnchor", () => {
  it("appends transcript when anchor is at end", () => {
    expect(insertTranscriptAtAnchor("Morning journal.", 16, "Video reflection here.")).toBe(
      "Morning journal.\n\nVideo reflection here.",
    );
  });

  it("splices transcript mid-body", () => {
    expect(insertTranscriptAtAnchor("Before. After.", 7, "Spoken words.")).toBe(
      "Before.\n\nSpoken words.\n\nAfter.",
    );
  });
});

describe("resolveVideoAnchorOffset", () => {
  it("appends when the editor is not focused", () => {
    expect(resolveVideoAnchorOffset("Morning journal.", {})).toBe(16);
  });

  it("uses caret when editing mid-body", () => {
    expect(
      resolveVideoAnchorOffset("Before. After.", { caret: 7, bodyEditorFocused: true }),
    ).toBe(7);
  });

  it("appends when caret is at start but body already has text", () => {
    expect(
      resolveVideoAnchorOffset("Morning journal.", { caret: 0, bodyEditorFocused: true }),
    ).toBe(16);
  });
});

describe("effectiveVideoAnchor", () => {
  it("repairs anchor 0 when body has text", () => {
    expect(effectiveVideoAnchor("Morning journal.", 0)).toBe(16);
  });

  it("repairs mid-word splits", () => {
    const body = "So I was finally able to go to bed.";
    expect(effectiveVideoAnchor(body, "So I was finally a".length)).toBe(body.length);
  });

  it("keeps intentional sentence-boundary anchors", () => {
    expect(effectiveVideoAnchor("Before. After.", 7)).toBe(7);
  });
});
