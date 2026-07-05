import { describe, expect, it } from "vitest";
import { myAiWelcomeGreeting, WELCOME_TAIL_PHRASES } from "./welcomeGreeting";

describe("myAiWelcomeGreeting", () => {
  it("uses formal last name and a rotated tail phrase", () => {
    expect(myAiWelcomeGreeting("Andrew Heisley", () => 0)).toBe(
      "Hey, Mr. Heisley. Ready to dive in?",
    );
    expect(myAiWelcomeGreeting("Andrew Heisley", () => 1)).toBe(
      "Hey, Mr. Heisley. What's on your mind?",
    );
  });

  it("falls back when display name is empty", () => {
    expect(myAiWelcomeGreeting("", () => 2)).toBe("Hey. Where shall we start?");
  });

  it("wraps pick index into phrase list", () => {
    const idx = WELCOME_TAIL_PHRASES.length + 3;
    expect(myAiWelcomeGreeting("Andrew Heisley", () => idx)).toBe(
      `Hey, Mr. Heisley. ${WELCOME_TAIL_PHRASES[3]}`,
    );
  });
});
