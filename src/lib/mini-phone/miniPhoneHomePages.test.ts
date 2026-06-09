import { describe, expect, it } from "vitest";
import { splitMiniPhoneHomePages } from "./miniPhoneHomePages";

describe("splitMiniPhoneHomePages", () => {
  it("returns one empty page when there are no apps", () => {
    expect(splitMiniPhoneHomePages(0, 300, false)).toEqual([[]]);
  });

  it("fits apps on one page when grid is tall enough", () => {
    const pages = splitMiniPhoneHomePages(8, 400, false);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("splits overflow apps onto additional pages", () => {
    const pages = splitMiniPhoneHomePages(22, 160, true);
    expect(pages.length).toBeGreaterThan(1);
    const flat = pages.flat();
    expect(flat).toHaveLength(22);
    expect(flat).toEqual(Array.from({ length: 22 }, (_, i) => i));
  });
});
