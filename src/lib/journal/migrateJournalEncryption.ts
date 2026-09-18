import { supabase } from "@/integrations/supabase/client";
import { encryptTextField } from "@/lib/crypto/journalFieldCrypto";
import { getJournalDek, useJournalVaultStore } from "@/stores/journalVaultStore";
import { encryptPlaintextJournalDrafts } from "./journalDraftStorage";

type PlainRow = { id: string; revision: number; title: string | null; body: string; summary: string | null };
export type EncryptionMigrationDependencies = {
  readBatch: () => Promise<PlainRow[]>;
  convert: (row: PlainRow) => Promise<boolean>;
};
/** Never offset into a shrinking predicate. Counts only CAS-confirmed conversions. */
export async function drainPlaintextJournalEntries(deps: EncryptionMigrationDependencies): Promise<number> {
  let count = 0;
  const conflicts = new Map<string, number>();
  for (;;) {
    const rows = await deps.readBatch();
    if (!rows.length) return count; // Empty re-read verifies completion, including short final batches.
    for (const row of rows) {
      if (!Number.isSafeInteger(row.revision)) throw new Error("Journal revision support is required before encryption.");
      if (await deps.convert(row)) { count += 1; conflicts.delete(row.id); }
      else {
        const retries = (conflicts.get(row.id) ?? 0) + 1;
        conflicts.set(row.id, retries);
        if (retries >= 5) throw new Error("An entry is still being edited elsewhere. Encryption is incomplete; retry when editing stops.");
      }
    }
  }
}
export async function migratePlaintextEntriesToE2e(userId: string, dek: CryptoKey): Promise<number> {
  const checkAccess = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== userId || getJournalDek() !== dek || useJournalVaultStore.getState().locking) {
      throw new Error("Sign in and unlock the same journal to continue encryption.");
    }
  };
  await checkAccess();
  await encryptPlaintextJournalDrafts(userId, dek);
  return drainPlaintextJournalEntries({
    readBatch: async () => {
      await checkAccess();
      const { data, error } = await supabase.from("journal_entries")
        .select("id,revision,title,body,summary").eq("user_id", userId).eq("e2e_encrypted", false)
        .order("id").limit(40);
      if (error) throw error;
      return data ?? [];
    },
    convert: async (row) => {
      const encoded = {
        title: await encryptTextField(dek, row.title),
        body: (await encryptTextField(dek, row.body)) ?? "",
        summary: await encryptTextField(dek, row.summary),
        e2e_encrypted: true, analyze_for_mirror: false, embedding: null,
      };
      await checkAccess();
      const { data, error } = await supabase.from("journal_entries").update(encoded)
        .eq("id", row.id).eq("user_id", userId).eq("revision", row.revision).eq("e2e_encrypted", false)
        .select("id").maybeSingle();
      if (error) throw error;
      return Boolean(data); // A concurrent edit is re-read/re-encrypted, never overwritten.
    },
  });
}
