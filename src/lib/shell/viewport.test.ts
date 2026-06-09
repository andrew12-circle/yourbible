import { describe, expect, it } from "vitest";
import { COMPACT_VIEWPORT_PX } from "@/lib/shell/viewport";

describe("shell viewport", () => {
  it("uses 768px as the compact breakpoint", () => {
    expect(COMPACT_VIEWPORT_PX).toBe(768);
  });
});
