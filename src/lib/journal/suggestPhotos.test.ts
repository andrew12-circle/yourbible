import { describe, expect, it } from "vitest";
import { shouldSuggestJournalPhotos } from "./suggestPhotos";

describe("shouldSuggestJournalPhotos", () => {
  it("suggests photos for event-like entries without attachments", () => {
    expect(
      shouldSuggestJournalPhotos({
        body: "We are sitting here in the hospital room. Tish is in bed getting ready to give birth. I am excited and nervous.",
        title: "Caroline's Birth",
        hasPhotos: false,
      }),
    ).toBe(true);
  });

  it("does not suggest when photos are already attached", () => {
    expect(
      shouldSuggestJournalPhotos({
        body: "We celebrated her birth at the hospital today.",
        hasPhotos: true,
      }),
    ).toBe(false);
  });

  it("does not suggest for very short notes", () => {
    expect(
      shouldSuggestJournalPhotos({
        body: "Feeling grateful today.",
        hasPhotos: false,
      }),
    ).toBe(false);
  });

  it("does not suggest for private vent entries", () => {
    expect(
      shouldSuggestJournalPhotos({
        body: "We went to the hospital today and everything was overwhelming and hard to process for a long time.",
        hasPhotos: false,
        entryKind: "vent",
      }),
    ).toBe(false);
  });
});
