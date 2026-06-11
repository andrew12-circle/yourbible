import { describe, expect, it } from "vitest";
import { BOOKS } from "@/data/books";
import {
  bookStartPageNumber,
  bookToContentsRow,
  chaptersBeforeBook,
  splitBooksTwoColumns,
} from "./bibleContents";

describe("bibleContents", () => {
  it("starts Genesis at page 1", () => {
    expect(bookStartPageNumber("Gen")).toBe(1);
    expect(chaptersBeforeBook("Gen")).toBe(0);
  });

  it("assigns increasing page numbers through the canon", () => {
    const gen = bookStartPageNumber("Gen");
    const mat = bookStartPageNumber("Mat");
    const rev = bookStartPageNumber("Rev");
    expect(mat).toBeGreaterThan(gen);
    expect(rev).toBeGreaterThan(mat);
  });

  it("splits testament lists into two balanced columns", () => {
    const ot = BOOKS.filter((b) => b.testament === "OT");
    const [left, right] = splitBooksTwoColumns(ot);
    expect(left.length + right.length).toBe(ot.length);
    expect(left[0]?.abbr).toBe("Gen");
    expect(right[0]?.abbr).toBe("Ecc");
  });

  it("builds clickable rows for books", () => {
    const row = bookToContentsRow(BOOKS.find((b) => b.abbr === "Jhn")!);
    expect(row.label).toBe("JOHN");
    expect(row.clickable).toBe(true);
    expect(row.bookAbbr).toBe("Jhn");
    expect(row.chapter).toBe(1);
  });
});
