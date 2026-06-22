import { decryptTextField, encryptTextField } from "@/lib/crypto/journalFieldCrypto";
import {
  classifyJournalSaveCryptoError,
  journalEntryMustEncrypt,
  journalSaveCryptoErrorMessage,
} from "@/lib/journal/journalE2ePolicy";
import {
  getJournalDek,
  isJournalVaultUnlocked,
} from "@/stores/journalVaultStore";

export const JOURNAL_E2E_COLUMN = "e2e_encrypted";

export const LOCKED_ENTRY_TITLE = "Encrypted entry";
export const LOCKED_ENTRY_BODY =
  "Unlock your journal passphrase in Settings → Journal privacy to read this entry.";
export const LOCKED_ENTRY_SNIPPET = "🔒 Encrypted";

export type JournalTextFields = {
  title: string | null;
  body: string;
  summary?: string | null;
};

export type JournalRowWithE2e = JournalTextFields & {
  e2e_encrypted?: boolean | null;
};

export type DecryptedJournalRow<T extends JournalRowWithE2e> = T & {
  contentLocked?: boolean;
};

/** Encrypt title/body/summary before writing to Supabase when vault is unlocked. */
export async function encryptJournalPayload<T extends Record<string, unknown>>(
  payload: T,
): Promise<T & { e2e_encrypted: true; analyze_for_mirror: false; embedding: null }> {
  const dek = getJournalDek();
  if (!dek) throw new Error("Journal vault is locked");

  const out = { ...payload } as T & { e2e_encrypted: true; analyze_for_mirror: false; embedding: null };

  if ("title" in payload) {
    (out as JournalTextFields).title = await encryptTextField(dek, (payload.title as string | null) ?? null);
  }
  if ("body" in payload && typeof payload.body === "string") {
    (out as JournalTextFields).body = (await encryptTextField(dek, payload.body as string)) ?? "";
  }
  if ("summary" in payload) {
    (out as JournalTextFields).summary = await encryptTextField(
      dek,
      (payload.summary as string | null) ?? null,
    );
  }

  out.e2e_encrypted = true;
  out.analyze_for_mirror = false;
  out.embedding = null;
  return out;
}

/** Apply E2E encryption to a save payload when required; no-op when off or locked (non-private). */
export async function maybeEncryptJournalPayload<T extends Record<string, unknown>>(
  payload: T,
  opts?: { journalId?: string | null },
): Promise<T> {
  const journalId =
    opts?.journalId ??
    (typeof payload.journal_id === "string" ? payload.journal_id : null);

  const block = classifyJournalSaveCryptoError(journalId);
  if (block) {
    throw new Error(journalSaveCryptoErrorMessage(block));
  }

  if (!journalEntryMustEncrypt(journalId) || !isJournalVaultUnlocked()) return payload;

  const hasText =
    ("body" in payload && typeof payload.body === "string") ||
    ("title" in payload && typeof payload.title === "string") ||
    ("summary" in payload && typeof payload.summary === "string");
  if (!hasText) return payload;
  return encryptJournalPayload(payload);
}

/** Decrypt a journal row after reading from Supabase. */
export async function decryptJournalRow<T extends JournalRowWithE2e>(
  row: T,
): Promise<DecryptedJournalRow<T>> {
  if (!row.e2e_encrypted) return row;

  if (!isJournalVaultUnlocked()) {
    return {
      ...row,
      title: LOCKED_ENTRY_TITLE,
      body: LOCKED_ENTRY_BODY,
      summary: null,
      contentLocked: true,
    };
  }

  const dek = getJournalDek();
  if (!dek) {
    return {
      ...row,
      title: LOCKED_ENTRY_TITLE,
      body: LOCKED_ENTRY_BODY,
      summary: null,
      contentLocked: true,
    };
  }

  return {
    ...row,
    title: await decryptTextField(dek, row.title),
    body: (await decryptTextField(dek, row.body)) ?? "",
    summary: row.summary != null ? await decryptTextField(dek, row.summary) : row.summary,
    contentLocked: false,
  };
}

export async function decryptJournalRows<T extends JournalRowWithE2e>(
  rows: T[],
): Promise<DecryptedJournalRow<T>[]> {
  return Promise.all(rows.map((row) => decryptJournalRow(row)));
}

/** List preview when locked — hide ciphertext, show lock hint. */
export function lockedListPreview<T extends JournalRowWithE2e>(row: T): DecryptedJournalRow<T> {
  return {
    ...row,
    title: LOCKED_ENTRY_TITLE,
    body: LOCKED_ENTRY_SNIPPET,
    summary: null,
    contentLocked: true,
  };
}

export async function decryptJournalListRow<T extends JournalRowWithE2e>(
  row: T,
): Promise<DecryptedJournalRow<T>> {
  if (!row.e2e_encrypted) return row;
  if (!isJournalVaultUnlocked()) return lockedListPreview(row);
  return decryptJournalRow(row);
}
