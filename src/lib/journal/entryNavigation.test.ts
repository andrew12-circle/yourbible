import { describe, expect, it } from "vitest";
import {
  journalDeskEntryHref,
  journalEntryHref,
  journalNewEntryEditHref,
} from "./entryNavigation";

describe("entryNavigation", () => {
  it("routes chat entries to journal chat", () => {
    expect(journalEntryHref("abc", "chat")).toBe("/journal/chat/abc");
    expect(journalDeskEntryHref("abc", "jid", "chat")).toBe("/journal/chat/abc");
  });

  it("routes normal entries to read and desk URLs", () => {
    expect(journalEntryHref("abc", null)).toBe("/journal/abc");
    expect(journalDeskEntryHref("abc", "jid", null)).toBe("/journal/j/jid/e/abc");
    expect(journalDeskEntryHref("abc", null, null)).toBe("/journal/e/abc");
    expect(journalNewEntryEditHref("abc")).toBe("/journal/abc/edit");
  });
});
