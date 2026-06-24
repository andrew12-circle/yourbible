import { describe, expect, it } from "vitest";
import {
  MOBILE_PAGE_MARGIN_GUTTER,
  MOBILE_PAGE_MARGIN_H,
  pageHorizontalPadding,
} from "@/lib/bible/readerPageMargins";

describe("pageHorizontalPadding", () => {
  it("uses asymmetric gutters on compact mobile spreads", () => {
    expect(pageHorizontalPadding("left", true, true)).toEqual({
      paddingLeft: MOBILE_PAGE_MARGIN_GUTTER,
      paddingRight: MOBILE_PAGE_MARGIN_H,
    });
    expect(pageHorizontalPadding("right", true, true)).toEqual({
      paddingLeft: MOBILE_PAGE_MARGIN_H,
      paddingRight: MOBILE_PAGE_MARGIN_GUTTER,
    });
  });
});
