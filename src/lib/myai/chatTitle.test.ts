import { describe, expect, it } from "vitest";
import {
  AUTO_CHAT_TITLE_MAX_WORDS,
  chatTitleFromFirstMessage,
  claimResearchChatTitle,
  hardQuestionChatTitle,
  truncateToWordCount,
} from "@/lib/myai/chatTitle";

describe("truncateToWordCount", () => {
  it("keeps short text intact", () => {
    expect(truncateToWordCount("Good afternoon")).toBe("Good afternoon");
  });

  it("limits to five words by default", () => {
    expect(truncateToWordCount("one two three four five six seven")).toBe("one two three four five…");
  });
});

describe("chatTitleFromFirstMessage", () => {
  it("uses the first sentence capped at five words", () => {
    expect(chatTitleFromFirstMessage("  Good afternoon. How are you?  ")).toBe("Good afternoon");
  });

  it("truncates long opening sentences to five words", () => {
    const long = "alpha beta gamma delta epsilon zeta eta theta";
    expect(chatTitleFromFirstMessage(long)).toBe(
      truncateToWordCount(long.split(/[.!?]/)[0]!, AUTO_CHAT_TITLE_MAX_WORDS),
    );
  });

  it("falls back when empty", () => {
    expect(chatTitleFromFirstMessage("   ")).toBe("New chat");
  });
});

describe("claimResearchChatTitle", () => {
  it("uses a short claim snippet without artifact title", () => {
    expect(
      claimResearchChatTitle(
        "Mankind did not invent civilization but inherited it, and humans were never primitive",
      ),
    ).toBe("Claim research: Mankind did not…");
  });
});

describe("hardQuestionChatTitle", () => {
  it("caps the question portion", () => {
    expect(
      hardQuestionChatTitle("Why doesn't the Bible mention dinosaurs, even though it mentions dragons?"),
    ).toBe("Hard question — Why doesn't the…");
  });
});
