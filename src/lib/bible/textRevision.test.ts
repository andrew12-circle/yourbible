import { describe, expect, it } from "vitest";
import { CSB_TEXT_REVISION, PASSAGE_PARSER_REVISION } from "@/lib/bible/textRevision";
import { passageCacheKey } from "@/lib/bible/passageCache";

describe("textRevision", () => {
  it("pins CSB to a stable revision token", () => {
    expect(CSB_TEXT_REVISION).toMatch(/^api-bible-csb-/);
  });

  it("includes parser revision in cache keys for reproducible invalidation", () => {
    expect(passageCacheKey("bible-id", "Gen", 1)).toContain(PASSAGE_PARSER_REVISION);
  });
});
