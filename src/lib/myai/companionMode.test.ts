import { describe, expect, it } from "vitest";
import { buildMyAiTurnBody, myAiBodyForCompanionMode } from "@/lib/myai/companionMode";

describe("myAiBodyForCompanionMode", () => {
  it("chatgpt mode enables general knowledge and deep answers by default", () => {
    expect(
      myAiBodyForCompanionMode({
        companionMode: "chatgpt",
        includeGeneral: false,
        responseDepth: "auto",
      }),
    ).toEqual({
      companion_mode: "chatgpt",
      include_general_knowledge: true,
      response_depth: "deep",
    });
  });

  it("inward mode respects user toggles", () => {
    expect(
      myAiBodyForCompanionMode({
        companionMode: "inward",
        includeGeneral: false,
        responseDepth: "reflect",
      }),
    ).toEqual({
      companion_mode: "inward",
      include_general_knowledge: false,
      response_depth: "reflect",
    });
  });
});

describe("buildMyAiTurnBody", () => {
  it("merges library scope over chatgpt defaults for one turn", () => {
    expect(
      buildMyAiTurnBody("library", {
        companionMode: "chatgpt",
        includeGeneral: true,
        responseDepth: "auto",
      }),
    ).toEqual({
      companion_mode: "chatgpt",
      research_scope: "library",
      include_general_knowledge: false,
      response_depth: "deep",
    });
  });
});
