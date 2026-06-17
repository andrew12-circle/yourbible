import { describe, expect, it } from "vitest";
import { mapCursorAfterEdit } from "./mapCursorAfterEdit";

describe("mapCursorAfterEdit", () => {
  it("keeps cursor when text unchanged", () => {
    expect(mapCursorAfterEdit("hello", "hello", 3)).toBe(3);
  });

  it("moves cursor to end when it was at end", () => {
    expect(mapCursorAfterEdit("helo", "hello", 4)).toBe(5);
  });

  it("maps cursor after a typo fix in the middle", () => {
    const oldText = "green pasturs and still waters";
    const newText = "green pastures and still waters";
    const cursor = "green pasturs and".length;
    expect(mapCursorAfterEdit(oldText, newText, cursor)).toBe("green pastures and".length);
  });
});
