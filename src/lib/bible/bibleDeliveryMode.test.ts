import { describe, expect, it } from "vitest";
import { API_BIBLE_CSB_ID, bibleDeliveryMode } from "./bibleEditions";

describe("Bible delivery mode", () => {
  it("keeps development fixtures bundled but makes production CSB remote", () => {
    expect(bibleDeliveryMode(API_BIBLE_CSB_ID, false)).toBe("bundled");
    expect(bibleDeliveryMode(API_BIBLE_CSB_ID, true)).toBe("remote");
  });

  it("does not enable arbitrary remote translations", () => {
    expect(bibleDeliveryMode("unknown-edition", true)).toBe("unsupported");
  });
});
