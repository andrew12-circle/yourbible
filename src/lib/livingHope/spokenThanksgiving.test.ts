import { describe, expect, it } from "vitest";
import { placeSpokenThanksgiving, splitSpokenThanksgiving } from "./spokenThanksgiving";

describe("spoken thanksgiving", () => {
  it("splits explicit spoken items without rewriting the speaker", () => {
    expect(splitSpokenThanksgiving("My family next item A new day next item Rest")).toEqual(["My family", "A new day", "Rest"]);
  });
  it("recognizes numbered dictation", () => {
    expect(splitSpokenThanksgiving("Number one my home. Number two my wife. Number three our children.")).toEqual(["my home.", "my wife.", "our children."]);
  });
  it("recognizes repeated thanksgiving phrases", () => {
    expect(splitSpokenThanksgiving("I am thankful for today. I am grateful for tomorrow.")).toHaveLength(2);
  });
  it("does not split a single thought at and or ordinary punctuation", () => {
    expect(splitSpokenThanksgiving("Tish and the children. We are together.")).toEqual(["Tish and the children. We are together."]);
  });
  it("fills empty slots but never overwrites a typed answer", () => {
    expect(placeSpokenThanksgiving(["Saved", "", "Another", "", ""], "New next item More")).toEqual({ values: ["Saved", "New", "Another", "More", ""], remaining: "", placed: 2 });
  });
  it("keeps overflow verbatim for review", () => {
    expect(placeSpokenThanksgiving(["1", "2", "3", "4", ""], "Five next item Six next item Seven")).toMatchObject({ placed: 1, remaining: "Six\nSeven" });
  });
  it("never invents entries to reach five", () => {
    expect(placeSpokenThanksgiving([], "One thought").values).toEqual(["One thought", "", "", "", ""]);
  });
  it("retains all spoken content when the list is full", () => {
    expect(placeSpokenThanksgiving(["a", "b", "c", "d", "e"], "Keep this")).toMatchObject({ remaining: "Keep this", placed: 0 });
  });
});
