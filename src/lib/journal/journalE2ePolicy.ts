import {
  getJournalDek,
  isJournalE2eEnabled,
  isJournalVaultUnlocked,
  useJournalVaultStore,
} from "@/stores/journalVaultStore";

export function isE2eRequiredJournalId(journalId: string | null | undefined): boolean {
  if (!journalId) return false;
  return useJournalVaultStore.getState().e2eRequiredJournalIds.has(journalId);
}

export function journalEntryMustEncrypt(journalId: string | null | undefined): boolean {
  return isJournalE2eEnabled() || isE2eRequiredJournalId(journalId);
}

export type JournalSaveCryptoErrorCode = "setup_required" | "unlock_required" | "locked";

export function classifyJournalSaveCryptoError(
  journalId: string | null | undefined,
): JournalSaveCryptoErrorCode | null {
  if (!journalEntryMustEncrypt(journalId)) return null;
  if (isE2eRequiredJournalId(journalId) && !isJournalE2eEnabled()) return "setup_required";
  if (!isJournalVaultUnlocked() || !getJournalDek()) return "unlock_required";
  return null;
}

export function journalSaveCryptoErrorMessage(code: JournalSaveCryptoErrorCode): string {
  switch (code) {
    case "setup_required":
      return "Set up journal encryption in Settings → Journal privacy before saving to Private.";
    case "unlock_required":
      return "Unlock your journal passphrase to save encrypted entries.";
    default:
      return "Journal encryption is required for this notebook.";
  }
}
