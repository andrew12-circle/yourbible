import { describe, expect, it } from "vitest";
import {
  journalEntryTitleInputClass,
  journalPlainWriteFieldClass,
} from "@/lib/journal/journalChatUi";

describe("journal editor typography", () => {
  it("keeps the intended title and body sizes at desktop breakpoints", () => {
    expect(journalEntryTitleInputClass).toContain("lg:text-[36px]");
    expect(journalPlainWriteFieldClass).toContain("lg:text-[16px]");
  });
});
