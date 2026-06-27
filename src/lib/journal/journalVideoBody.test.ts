import { describe, expect, it } from "vitest";
import {
  appendVideoSpeechFinal,
  bodyWithLiveVideoTranscript,
  composeVideoLiveTranscript,
  insertTranscriptAtAnchor,
  liveTranscriptTickerLine,
  prepareVideoJournalTranscript,
  resolveVideoAnchorOffset,
  effectiveVideoAnchor,
  replaceTranscriptBeforeVideo,
} from "@/lib/journal/journalVideoBody";

describe("composeVideoLiveTranscript", () => {
  it("combines finalized speech with the current partial phrase", () => {
    expect(composeVideoLiveTranscript("Hello world.", "How are")).toBe("Hello world. How are");
  });

  it("returns finalized text when partial is empty", () => {
    expect(composeVideoLiveTranscript("Hello world.", "")).toBe("Hello world.");
  });

  it("does not duplicate interim that overlaps finalized tail", () => {
    expect(composeVideoLiveTranscript("good morning ", "good morning")).toBe("good morning");
  });
});

describe("prepareVideoJournalTranscript", () => {
  it("returns empty for blank input", () => {
    expect(prepareVideoJournalTranscript("   ")).toBe("");
  });
});

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

describe("replaceTranscriptBeforeVideo", () => {
  it("replaces the full body when the video sits at the end", () => {
    expect(
      replaceTranscriptBeforeVideo(
        "Okay I don't look very good but cuz I'm running down",
        0,
        "Full five minute reflection about the rough day ahead.",
      ),
    ).toBe("Full five minute reflection about the rough day ahead.");
  });

  it("keeps trailing text when the video is inline mid-body", () => {
    expect(replaceTranscriptBeforeVideo("Old spoken.\n\nTrailing notes.", 11, "New spoken words.")).toBe(
      "New spoken words.\n\nTrailing notes.",
    );
  });
});

describe("liveTranscriptTickerLine", () => {
  it("keeps a single line by showing the tail of long text", () => {
    const long = "one two three four five six seven eight nine ten eleven twelve";
    const line = liveTranscriptTickerLine(long, 24);
    expect(line.split("\n")).toHaveLength(1);
    expect(line.startsWith("…")).toBe(true);
    expect(line.endsWith("twelve")).toBe(true);
  });
});

describe("appendVideoSpeechFinal", () => {
  it("skips rapid duplicate finals from mic restarts", () => {
    const first = appendVideoSpeechFinal("", "good morning");
    const second = appendVideoSpeechFinal(first.text, "good morning", first.lastFinal, first.lastFinal.at + 200);
    expect(second.text).toBe("good morning ");
  });

  it("allows the same phrase again after a pause", () => {
    const first = appendVideoSpeechFinal("", "good morning");
    const second = appendVideoSpeechFinal(first.text, "good morning", first.lastFinal, first.lastFinal.at + 2000);
    expect(second.text).toBe("good morning good morning ");
  });
});

describe("bodyWithLiveVideoTranscript", () => {
  it("inserts live speech at anchor from a frozen base body", () => {
    expect(bodyWithLiveVideoTranscript("Start. End.", 7, "spoken words")).toBe(
      "Start.\n\nspoken words\n\nEnd.",
    );
  });
});
