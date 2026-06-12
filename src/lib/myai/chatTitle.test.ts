import { describe, expect, it } from "vitest";
import { chatTitleFromFirstMessage } from "@/lib/myai/chatTitle";

describe("chatTitleFromFirstMessage", () => {
  it("uses the first sentence and trims long text", () => {
    expect(chatTitleFromFirstMessage("  Good afternoon. How are you?  ")).toBe("Good afternoon");
  });

  it("truncates very long opening sentences", () => {
    const long = "a".repeat(60);
    expect(chatTitleFromFirstMessage(long)).toBe(`${"a".repeat(53)}…`);
  });

  it("falls back when empty", () => {
    expect(chatTitleFromFirstMessage("   ")).toBe("New chat");
  });
});
