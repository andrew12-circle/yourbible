import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { journalEntryMustEncrypt } from "./journalE2ePolicy";
export type JournalAiEntry = { entry_kind?: string | null; journal_id?: string | null; e2e_encrypted?: boolean | null; contentLocked?: boolean };
export function journalCloudAiAllowed(entry: JournalAiEntry | null | undefined): boolean {
  return Boolean(entry && !entry.contentLocked && !entry.e2e_encrypted && entry.entry_kind !== "vent"
    && !journalEntryMustEncrypt(entry.journal_id) && !useJournalVaultStore.getState().locking);
}
