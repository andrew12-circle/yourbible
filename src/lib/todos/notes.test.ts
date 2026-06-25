import { describe, expect, it } from "vitest";
import { formatTodoNoteTimestamp, prependTimestampedNoteBlock } from "./notes";

describe("formatTodoNoteTimestamp", () => {
  it("formats a stable locale string", () => {
    const stamp = formatTodoNoteTimestamp(new Date("2026-06-25T14:30:00"));
    expect(stamp).toMatch(/Jun/);
    expect(stamp).toMatch(/25/);
    expect(stamp).toMatch(/2026/);
  });
});

describe("prependTimestampedNoteBlock", () => {
  it("prefixes the first note with a timestamp", () => {
    const next = prependTimestampedNoteBlock("", new Date("2026-06-25T14:30:00"));
    expect(next).toMatch(/^\[Jun 25, 2026/);
    expect(next.endsWith("] ")).toBe(true);
  });

  it("separates additional notes with blank lines", () => {
    const next = prependTimestampedNoteBlock(
      "[Jun 24, 2026, 9:00 AM] First note",
      new Date("2026-06-25T14:30:00"),
    );
    expect(next.startsWith("[Jun 24, 2026, 9:00 AM] First note\n\n[")).toBe(true);
  });
});
