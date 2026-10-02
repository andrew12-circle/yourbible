import { describe, expect, it } from "vitest";
import {
  bibleHubSearchUrl,
  matchingBibleBooks,
  universalEarthHref,
  universalLifeGuideHref,
  universalVisualHref,
  visualSectionForKind,
} from "./universalSearch";

describe("universal Bible search helpers", () => {
  it("builds encoded deep-study links", () => {
    expect(bibleHubSearchUrl("armor of God")).toBe(
      "https://biblehub.com/search.php?q=armor%20of%20God",
    );
    expect(universalEarthHref("Mount Carmel")).toBe("/bible/earth?q=Mount%20Carmel");
    expect(universalLifeGuideHref("fear and anxiety")).toBe(
      "/bible/life-guide?q=fear%20and%20anxiety",
    );
  });

  it("builds visual library links with a section and exact asset", () => {
    expect(universalVisualHref("Rembrandt", "art", "work-123")).toBe(
      "/bible/explore?section=art&q=Rembrandt&visual=work-123",
    );
  });

  it("matches Bible books without treating them as generic text only", () => {
    expect(matchingBibleBooks("john")[0]?.name).toBe("John");
    expect(matchingBibleBooks("rom")[0]?.name).toBe("Romans");
  });

  it("routes visual kinds to the right gallery section", () => {
    expect(visualSectionForKind("artwork")).toBe("art");
    expect(visualSectionForKind("map")).toBe("maps");
    expect(visualSectionForKind("manuscript")).toBe("objects");
    expect(visualSectionForKind("place-photo")).toBe("places");
  });
});
