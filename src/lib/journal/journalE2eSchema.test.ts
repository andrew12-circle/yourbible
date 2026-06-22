import { describe, expect, it } from "vitest";
import {
  formatJournalLoadError,
  isJournalE2eSchemaError,
  journalE2eSchemaHint,
} from "@/lib/journal/journalE2eSchema";

describe("journalE2eSchema", () => {
  it("detects missing e2e_encrypted column", () => {
    expect(
      isJournalE2eSchemaError({
        code: "42703",
        message: 'column journal_entries.e2e_encrypted does not exist',
        details: "",
        hint: "",
      }),
    ).toBe(true);
  });

  it("formats schema errors with migration hint", () => {
    const msg = formatJournalLoadError({
      code: "PGRST204",
      message: "Could not find the 'e2e_encrypted' column",
      details: "",
      hint: "",
    });
    expect(msg).toContain("20260620120000_journal_e2e_encryption.sql");
    expect(msg).toContain("still in the database");
    expect(journalE2eSchemaHint()).toContain("still in the database");
  });
});
