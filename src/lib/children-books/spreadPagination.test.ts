import { describe, expect, it } from "vitest";
import {
  childrenBookSpreadCount,
  leftStoryPageIndex,
  rightStoryPageIndex,
  storyPageNumber,
} from "@/lib/children-books/spreadPagination";

describe("spreadPagination", () => {
  it("pairs story pages into spreads", () => {
    expect(childrenBookSpreadCount([{ title: "a" }, { title: "b" }, { title: "c" }] as never)).toBe(2);
    expect(childrenBookSpreadCount([{ title: "a" }] as never)).toBe(1);
  });

  it("maps spread indices to left and right story pages", () => {
    expect(leftStoryPageIndex(0)).toBe(0);
    expect(leftStoryPageIndex(2)).toBe(4);
    expect(rightStoryPageIndex(0, 3)).toBe(1);
    expect(rightStoryPageIndex(1, 4)).toBe(3);
    expect(rightStoryPageIndex(1, 3)).toBeNull();
    expect(rightStoryPageIndex(2, 4)).toBeNull();
  });

  it("numbers story pages from one", () => {
    expect(storyPageNumber(0)).toBe(1);
    expect(storyPageNumber(4)).toBe(5);
  });
});
