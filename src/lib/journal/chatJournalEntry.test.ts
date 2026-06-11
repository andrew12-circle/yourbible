import { describe, expect, it } from "vitest";
import {
  CHAT_EXPORT_MARKER,
  composeSavedChatJournalBody,
  parseChatJournalEntry,
} from "@/lib/journal/chatJournalEntry";

describe("composeSavedChatJournalBody", () => {
  it("preserves trailing spaces while the summary is being edited", () => {
    const body = composeSavedChatJournalBody("I ", [{ role: "user", content: "hi" }]);
    expect(body.startsWith("I \n\n")).toBe(true);
    expect(body).toContain(CHAT_EXPORT_MARKER);
  });

  it("still treats whitespace-only summaries as empty", () => {
    const body = composeSavedChatJournalBody("   ", [{ role: "user", content: "hi" }]);
    expect(body).toBe(`${CHAT_EXPORT_MARKER}\n{"v":1,"messages":[{"role":"user","content":"hi"}]}`);
  });
});

describe("parseChatJournalEntry", () => {
  it("reads summary text with spaces from structured exports", () => {
    const body = composeSavedChatJournalBody("I think it is great", [
      { role: "assistant", content: "Hello" },
    ]);
    const parsed = parseChatJournalEntry(body, "I think it is great");
    expect(parsed.summary).toBe("I think it is great");
  });
});
