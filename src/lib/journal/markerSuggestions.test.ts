import { describe, expect, it } from "vitest";
import {
  entryKindForHashtag,
  filterHashtagMarkerSuggestions,
  filterJournalMarkerSuggestions,
} from "./markerSuggestions";

describe("filterHashtagMarkerSuggestions", () => {
  it("returns built-in tags when query is empty", () => {
    const hits = filterHashtagMarkerSuggestions("", []);
    expect(hits.map((h) => h.tag)).toContain("praisereport");
    expect(hits.map((h) => h.tag)).toContain("hard-question");
    expect(hits.map((h) => h.tag)).toContain("ask-god");
  });

  it("filters by query", () => {
    const hits = filterHashtagMarkerSuggestions("praise", []);
    expect(hits[0]?.tag).toBe("praisereport");
  });
});

describe("filterJournalMarkerSuggestions", () => {
  it("includes built-in mentions when query is empty", () => {
    const hits = filterJournalMarkerSuggestions("", []);
    expect(hits.map((h) => h.name)).toContain("Questions for God");
    expect(hits.map((h) => h.name)).toContain("Hard questions");
  });
});

describe("entryKindForHashtag", () => {
  it("maps praisereport to praise_report", () => {
    expect(entryKindForHashtag("praisereport")).toBe("praise_report");
  });
});
