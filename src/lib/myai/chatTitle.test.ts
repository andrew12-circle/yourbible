import { describe, expect, it } from "vitest";
import {
  AUTO_CHAT_TITLE_MAX_WORDS,
  chatTitleFromFirstMessage,
  claimResearchChatTitle,
  formatChatSessionTitle,
  hardQuestionChatTitle,
  normalizeChatSessionTitle,
  truncateToWordCount,
} from "@/lib/myai/chatTitle";

describe("truncateToWordCount", () => {
  it("keeps short text intact", () => {
    expect(truncateToWordCount("Good afternoon")).toBe("Good afternoon");
  });

  it("limits to seven words by default", () => {
    expect(truncateToWordCount("one two three four five six seven eight")).toBe(
      "one two three four five six seven…",
    );
  });
});

describe("normalizeChatSessionTitle", () => {
  it("caps legacy long claim research titles", () => {
    const long =
      'Claim research: Mankind did not invent civilization but inherited it, and humans were … (The Universe before Humanity (aliens, megaliths, & ancient empires) w/Tim Alberino)';
    expect(normalizeChatSessionTitle(long)).toBe(
      "Claim research: Mankind did not invent civilization…",
    );
    expect(normalizeChatSessionTitle(long).split(/\s+/).length).toBeLessThanOrEqual(
      AUTO_CHAT_TITLE_MAX_WORDS,
    );
  });
});

describe("formatChatSessionTitle", () => {
  it("falls back to Untitled", () => {
    expect(formatChatSessionTitle(null)).toBe("Untitled");
  });
});

describe("chatTitleFromFirstMessage", () => {
  it("uses the first sentence capped at seven words", () => {
    expect(chatTitleFromFirstMessage("  Good afternoon. How are you?  ")).toBe("Good afternoon");
  });

  it("truncates long opening sentences to seven words", () => {
    const long = "alpha beta gamma delta epsilon zeta eta theta iota";
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
    ).toBe("Claim research: Mankind did not invent civilization…");
  });
});

describe("hardQuestionChatTitle", () => {
  it("caps the question portion", () => {
    expect(
      hardQuestionChatTitle("Why doesn't the Bible mention dinosaurs, even though it mentions dragons?"),
    ).toBe("Hard question — Why doesn't the Bible…");
  });
});
