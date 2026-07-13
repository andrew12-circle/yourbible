import { describe, expect, it } from "vitest";
import {
  CHILDREN_SPREAD_GUTTER,
  childrenBookPagePadding,
} from "@/lib/children-books/pageMargins";

describe("childrenBookPagePadding", () => {
  it("insets art toward the spine on spread layouts", () => {
    expect(childrenBookPagePadding("left", "art", false)).toEqual({
      paddingLeft: 0,
      paddingRight: CHILDREN_SPREAD_GUTTER,
    });
    expect(childrenBookPagePadding("right", "art", false)).toEqual({
      paddingLeft: CHILDREN_SPREAD_GUTTER,
      paddingRight: 0,
    });
  });

  it("uses tighter spread gutters for text pages", () => {
    expect(childrenBookPagePadding("left", "text", false)).toMatchObject({
      paddingRight: CHILDREN_SPREAD_GUTTER,
    });
    expect(childrenBookPagePadding("right", "text", false)).toMatchObject({
      paddingLeft: CHILDREN_SPREAD_GUTTER,
    });
  });
});
