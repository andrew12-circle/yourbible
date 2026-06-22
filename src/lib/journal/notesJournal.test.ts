import { describe, expect, it } from "vitest";
import { isNotesJournal, NOTES_JOURNAL_NAME, NOTES_SOURCE_KIND, NOTES_SOURCE_REF } from "@/lib/journal/notesJournal";

describe("isNotesJournal", () => {
  it("recognizes official notes notebook", () => {
    expect(
      isNotesJournal({
        source_kind: NOTES_SOURCE_KIND,
        source_ref: NOTES_SOURCE_REF,
        name: NOTES_JOURNAL_NAME,
        icon: "sticky-note",
      }),
    ).toBe(true);
  });

  it("recognizes legacy manual fallback notebook", () => {
    expect(
      isNotesJournal({
        source_kind: "manual",
        source_ref: NOTES_SOURCE_REF,
        name: NOTES_JOURNAL_NAME,
        icon: "sticky-note",
      }),
    ).toBe(true);
  });

  it("does not treat unrelated manual journals as notes", () => {
    expect(
      isNotesJournal({
        source_kind: "manual",
        source_ref: null,
        name: "Work",
        icon: "book",
      }),
    ).toBe(false);
  });
});
