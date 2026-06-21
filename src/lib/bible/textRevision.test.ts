import { describe, expect, it } from "vitest";
import {
  CSB_TEXT_REVISION,
  NKJV_TEXT_REVISION,
  PASSAGE_PARSER_REVISION,
  passageTextRevisionForBible,
} from "@/lib/bible/textRevision";
import { passageCacheKey } from "@/lib/bible/passageCache";

describe("textRevision", () => {
  it("pins CSB to a stable revision token", () => {
    expect(CSB_TEXT_REVISION).toMatch(/^api-bible-csb-/);
    expect(passageTextRevisionForBible("any-id", "CSB")).toBe(CSB_TEXT_REVISION);
  });

  it("pins NKJV to a stable revision token", () => {
    expect(NKJV_TEXT_REVISION).toMatch(/^api-bible-nkjv-/);
    expect(passageTextRevisionForBible("any-id", "NKJV")).toBe(NKJV_TEXT_REVISION);
    expect(passageTextRevisionForBible("any-id", undefined, "New King James Version")).toBe(
      NKJV_TEXT_REVISION,
    );
  });

  it("includes parser revision in cache keys for reproducible invalidation", () => {
    expect(passageCacheKey("bible-id", "Gen", 1)).toContain(PASSAGE_PARSER_REVISION);
  });
});
