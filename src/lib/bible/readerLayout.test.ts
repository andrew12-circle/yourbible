import { describe, expect, it } from "vitest";
import { deriveReaderLayout } from "@/lib/bible/readerLayout";

describe("deriveReaderLayout", () => {
  it("scroll mode is a single full-width column with no pagination", () => {
    const layout = deriveReaderLayout({
      displayMode: "scroll",
      spread: true,
      columnPreference: "double",
    });
    expect(layout.scrollMode).toBe(true);
    expect(layout.spread).toBe(false);
    expect(layout.columnsPerPage).toBe(0);
    expect(layout.spreadColumnCount).toBe(0);
    expect(layout.columnsClassName).toBe("");
    expect(layout.needsPagination).toBe(false);
    expect(layout.useSpreadPaginatorMeasure).toBe(false);
  });

  it("pages + spread + double preference yields four columns across the spread", () => {
    const layout = deriveReaderLayout({
      displayMode: "pages",
      spread: true,
      columnPreference: "double",
    });
    expect(layout.spread).toBe(true);
    expect(layout.columnLayout).toBe("double");
    expect(layout.columnsPerPage).toBe(2);
    expect(layout.spreadColumnCount).toBe(4);
    expect(layout.columnsClassName).toBe("scripture-columns-2");
    expect(layout.needsPagination).toBe(true);
    expect(layout.useSpreadPaginatorMeasure).toBe(true);
  });

  it("pages + spread + single preference yields one column per page", () => {
    const layout = deriveReaderLayout({
      displayMode: "pages",
      spread: true,
      columnPreference: "single",
    });
    expect(layout.spreadColumnCount).toBe(2);
    expect(layout.columnsClassName).toBe("");
    expect(layout.useSpreadPaginatorMeasure).toBe(false);
  });

  it("pages + single page + double preference yields two columns on one page", () => {
    const layout = deriveReaderLayout({
      displayMode: "pages",
      spread: false,
      columnPreference: "double",
    });
    expect(layout.spread).toBe(false);
    expect(layout.spreadColumnCount).toBe(2);
    expect(layout.useSpreadPaginatorMeasure).toBe(false);
  });
});
