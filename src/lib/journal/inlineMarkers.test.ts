import { describe, expect, it } from "vitest";
import {
  getActiveInlineMarker,
  mergeInlineTags,
  normalizeInlineTag,
  parseInlineHashtags,
  parseInlineJournalMentions,
  replaceInlineMarkerToken,
  resolveJournalByName,
  resolveJournalIdFromBody,
} from "./inlineMarkers";

describe("parseInlineHashtags", () => {
  it("parses single and multi-word tags", () => {
    expect(parseInlineHashtags("Feeling grateful today #gratitude and # prayer request")).toEqual([
      "gratitude",
      "prayer-request",
    ]);
  });

  it("skips markdown heading lines", () => {
    expect(parseInlineHashtags("# Heading line\nBody with #tag")).toEqual(["tag"]);
  });

  it("dedupes repeated tags", () => {
    expect(parseInlineHashtags("#hope again #Hope")).toEqual(["hope"]);
  });
});

describe("parseInlineJournalMentions", () => {
  it("parses spaced journal names", () => {
    expect(parseInlineJournalMentions("Today I wrote @ questions for god about trust.")).toEqual([
      "questions for god about trust",
    ]);
  });

  it("parses multiple mentions", () => {
    expect(parseInlineJournalMentions("@Prayer journal then @Gratitude")).toEqual([
      "Prayer journal then",
      "Gratitude",
    ]);
  });
});

describe("resolveJournalByName", () => {
  const journals = [
    { id: "j1", name: "Questions for God" },
    { id: "j2", name: "Gratitude" },
    { id: "j3", name: "Prayer journal" },
  ];

  it("resolves exact and partial names", () => {
    expect(resolveJournalByName("Questions for God", journals)?.id).toBe("j1");
    expect(resolveJournalByName("questions for god", journals)?.id).toBe("j1");
    expect(resolveJournalByName("questions for god about trust", journals)?.id).toBe("j1");
    expect(resolveJournalByName("gratitude", journals)?.id).toBe("j2");
    expect(resolveJournalByName("Prayer journal then", journals)?.id).toBe("j3");
  });
});

describe("resolveJournalIdFromBody", () => {
  it("returns first resolvable journal mention", () => {
    const id = resolveJournalIdFromBody("@ unknown @ Questions for God", [
      { id: "j1", name: "Questions for God" },
    ]);
    expect(id).toBe("j1");
  });
});

describe("mergeInlineTags", () => {
  it("merges manual and inline tags", () => {
    expect(mergeInlineTags("Wrote #gratitude", ["manual"])).toEqual(["manual", "gratitude"]);
  });
});

describe("getActiveInlineMarker", () => {
  it("detects active journal mention", () => {
    const text = "Hello @ quest";
    const marker = getActiveInlineMarker(text, text.length);
    expect(marker).toMatchObject({ kind: "journal", query: "quest" });
  });

  it("detects active hashtag with empty query", () => {
    const text = "Hello #";
    const marker = getActiveInlineMarker(text, text.length);
    expect(marker).toMatchObject({ kind: "hashtag", query: "" });
  });

  it("detects active journal mention with empty query", () => {
    const text = "Hello @";
    const marker = getActiveInlineMarker(text, text.length);
    expect(marker).toMatchObject({ kind: "journal", query: "" });
  });

  it("detects partial hashtag query", () => {
    const text = "Hello #grat";
    const marker = getActiveInlineMarker(text, text.length);
    expect(marker).toMatchObject({ kind: "hashtag", query: "grat" });
  });
});

describe("replaceInlineMarkerToken", () => {
  it("replaces journal token", () => {
    const text = "Hello @ ques";
    const marker = getActiveInlineMarker(text, text.length)!;
    const next = replaceInlineMarkerToken(text, marker, "Questions for God");
    expect(next.text).toBe("Hello @Questions for God ");
    expect(normalizeInlineTag("Questions for God")).toBe("questions-for-god");
  });
});
