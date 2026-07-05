import { describe, expect, it } from "vitest";
import { myAiWelcomeGreeting } from "./welcomeGreeting";

describe("myAiWelcomeGreeting", () => {
  it("uses formal last name when display name is known", () => {
    expect(myAiWelcomeGreeting("Andrew Heisley")).toBe("Hey, Mr. Heisley. Ready to dive in?");
  });

  it("falls back when display name is empty", () => {
    expect(myAiWelcomeGreeting("")).toBe("Hey. Ready to dive in?");
  });
});
