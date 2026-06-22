import { describe, expect, it, beforeEach } from "vitest";
import {
  classifyJournalSaveCryptoError,
  journalEntryMustEncrypt,
} from "@/lib/journal/journalE2ePolicy";
import { useJournalVaultStore } from "@/stores/journalVaultStore";

describe("journalE2ePolicy", () => {
  beforeEach(() => {
    useJournalVaultStore.getState().reset();
  });

  it("requires encryption for private journal ids", () => {
    useJournalVaultStore.getState().setE2eRequiredJournalIds(new Set(["private-journal-id"]));
    expect(journalEntryMustEncrypt("private-journal-id")).toBe(true);
    expect(journalEntryMustEncrypt("other-id")).toBe(false);
  });

  it("blocks private journal when encryption not set up", () => {
    useJournalVaultStore.getState().setE2eRequiredJournalIds(new Set(["p1"]));
    expect(classifyJournalSaveCryptoError("p1")).toBe("setup_required");
  });

  it("blocks when vault locked", () => {
    useJournalVaultStore.getState().setE2eEnabled(true);
    useJournalVaultStore.getState().setE2eRequiredJournalIds(new Set(["p1"]));
    expect(classifyJournalSaveCryptoError("p1")).toBe("unlock_required");
  });
});
