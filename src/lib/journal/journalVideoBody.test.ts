import { describe, expect, it } from "vitest";
import {
  appendVideoSpeechFinal,
  bodyWithLiveVideoTranscript,
  buildJournalBodySegments,
  composeVideoLiveTranscript,
  finalizeVideoJournalBody,
  pickBestVideoJournalTranscript,
  extractLiveTranscriptFromSnapBody,
  resolveVideoJournalTranscript,
  insertTranscriptAtAnchor,
  liveTranscriptTickerLine,
  normalizeLiveVideoTranscript,
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

  it("strips curse words from speech-to-text", () => {
    expect(prepareVideoJournalTranscript("I was fucking looking at the verse")).not.toMatch(
      /fuck/i,
    );
    expect(prepareVideoJournalTranscript("I was fucking looking at the verse")).toMatch(/looking/i);
  });
});

describe("normalizeLiveVideoTranscript", () => {
  it("strips curse words from live captions", () => {
    expect(normalizeLiveVideoTranscript("wait fucking what")).toBe("wait what");
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
  it("keeps anchor 0 for video-first journals with transcript body", () => {
    expect(effectiveVideoAnchor("Morning journal.", 0)).toBe(0);
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

describe("buildJournalBodySegments", () => {
  it("renders video before transcript text for video-first journals", () => {
    const body = "Today I prayed about patience and trust.";
    const video = {
      id: "v1",
      anchor_offset: 0,
      created_at: "2026-01-01T00:00:00Z",
    } as Parameters<typeof buildJournalBodySegments>[1][number];
    const segments = buildJournalBodySegments(body, [video]);
    expect(segments.map((s) => s.kind)).toEqual(["video", "text"]);
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

  it("does not repeat an identical phrase after a long pause", () => {
    const first = appendVideoSpeechFinal("", "good morning");
    const second = appendVideoSpeechFinal(first.text, "good morning", first.lastFinal, first.lastFinal.at + 2000);
    expect(second.text).toBe("good morning ");
  });

  it("replaces with cumulative finals from speech API restarts", () => {
    const first = appendVideoSpeechFinal("", "sleep schedules so");
    const second = appendVideoSpeechFinal(
      first.text,
      "sleep schedules so I was going from like 3:00 p.m.",
      first.lastFinal,
      first.lastFinal.at + 3000,
    );
    expect(second.text).toBe("sleep schedules so I was going from like 3:00 p.m. ");
  });

  it("skips finals already contained in the transcript", () => {
    const first = appendVideoSpeechFinal("", "sleep schedules so I was going");
    const second = appendVideoSpeechFinal(
      first.text,
      "sleep schedules",
      first.lastFinal,
      first.lastFinal.at + 3000,
    );
    expect(second.text).toBe("sleep schedules so I was going ");
  });
});

describe("pickBestVideoJournalTranscript", () => {
  it("returns the longest transcript source", () => {
    expect(
      pickBestVideoJournalTranscript("short clip", "much longer live caption text from the session"),
    ).toBe("much longer live caption text from the session");
  });
});

describe("extractLiveTranscriptFromSnapBody", () => {
  it("reads live preview text from the editor body", () => {
    const snap = { body: "", anchor: 0 };
    const body =
      "Okay Charlotte came over and we talked about Dad for a while before I got tired.";
    expect(extractLiveTranscriptFromSnapBody(snap, body)).toBe(body);
  });
});

describe("resolveVideoJournalTranscript", () => {
  it("prefers the longest of server, live, peak, and editor preview", () => {
    const snap = { body: "", anchor: 0 };
    const body = "Long editor preview from live captions while recording.";
    expect(
      resolveVideoJournalTranscript({
        serverTranscript: "Short server result.",
        liveTranscript: "Medium live at stop.",
        peakLiveTranscript: "Longest peak seen during pauses and recording.",
        snap,
        body,
      }),
    ).toBe("Long editor preview from live captions while recording.");
  });
});

describe("finalizeVideoJournalBody", () => {
  it("inserts from the frozen pre-record body when a snap exists", () => {
    expect(
      finalizeVideoJournalBody({ body: "Morning notes.", anchor: 14 }, "Morning notes.\n\nlive words", 14, "Final transcript."),
    ).toBe("Morning notes.\n\nFinal transcript.");
  });

  it("replaces live preview text when the snap was lost", () => {
    expect(
      finalizeVideoJournalBody(null, "live words only", 0, "Final transcript."),
    ).toBe("Final transcript.");
  });
});

describe("bodyWithLiveVideoTranscript", () => {
  it("inserts live speech at anchor from a frozen base body", () => {
    expect(bodyWithLiveVideoTranscript("Start. End.", 7, "spoken words")).toBe(
      "Start.\n\nspoken words\n\nEnd.",
    );
  });
});
