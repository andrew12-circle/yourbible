import { decryptTextField, encryptTextField } from "@/lib/crypto/journalFieldCrypto";
import { getJournalDek } from "@/stores/journalVaultStore";
import { journalEntryMustEncrypt } from "@/lib/journal/journalE2ePolicy";
import type { JournalPendingDraft } from "./journalSaveQueue";

const DATABASE = "yb_journal_pending_writes_v1";
const STORE = "drafts";
export const JOURNAL_DRAFT_CHANGED = "yourbible:journal-draft-changed";
export type JournalDraftEnvelope = {
  key: string; userId: string; entryId: string; writerId: string; encrypted: boolean;
  updatedAt: string; content: string;
};
const importedDrafts = new Map<string, JournalDraftEnvelope>();
let writerId: string | null = null;
export function journalDraftWriterId(): string {
  if (writerId) return writerId;
  try {
    writerId = sessionStorage.getItem("yb_journal_writer_v1") || crypto.randomUUID();
    sessionStorage.setItem("yb_journal_writer_v1", writerId);
  } catch { writerId = crypto.randomUUID(); }
  return writerId;
}
export function journalDraftKey(userId: string, entryId: string): string {
  return `${userId}:${entryId}:${journalDraftWriterId()}`;
}
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local journal storage is unavailable."));
    request.onblocked = () => reject(new Error("Another app window is blocking journal recovery storage."));
  });
}
async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error ?? request.error ?? new Error("Local journal write was interrupted."));
      tx.onerror = () => reject(tx.error ?? request.error ?? new Error("Local journal write failed."));
    });
  } finally { db.close(); }
}

export async function persistJournalDraft(userId: string, entryId: string, draft: JournalPendingDraft | null): Promise<void> {
  const key = journalDraftKey(userId, entryId);
  if (!draft) {
    await transaction("readwrite", (store) => store.delete(key));
    const imported = importedDrafts.get(key);
    if (imported) {
      await clearExactImportedDraft(imported);
      importedDrafts.delete(key);
    }
  } else {
    if (draft.base.userId !== userId || draft.base.id !== entryId) throw new Error("Draft ownership mismatch.");
    const journalId = (draft.pending.journal_id ?? draft.base.values.journal_id) as string | null;
    const encrypted = draft.base.encrypted || journalEntryMustEncrypt(journalId);
    let content = JSON.stringify(draft);
    if (encrypted) {
      const dek = getJournalDek();
      if (!dek) throw new Error("Unlock your journal to protect the local draft. Keep this entry open.");
      content = (await encryptTextField(dek, content))!;
    }
    const envelope: JournalDraftEnvelope = {
      key, userId, entryId, writerId: journalDraftWriterId(), encrypted, content, updatedAt: draft.updatedAt,
    };
    await transaction("readwrite", (store) => store.put(envelope));
  }
  window.dispatchEvent(new Event(JOURNAL_DRAFT_CHANGED));
}

export async function listJournalDrafts(userId: string): Promise<JournalDraftEnvelope[]> {
  const rows = await transaction<JournalDraftEnvelope[]>("readonly", (store) => store.getAll());
  return rows.filter((row) => row.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function decodeJournalDraft(row: JournalDraftEnvelope, userId: string): Promise<JournalPendingDraft> {
  if (row.userId !== userId) throw new Error("Draft belongs to a different account.");
  let text = row.content;
  if (row.encrypted) {
    const dek = getJournalDek();
    if (!dek) throw new Error("Unlock your journal to recover this draft.");
    text = (await decryptTextField(dek, text))!;
  }
  const draft = JSON.parse(text) as JournalPendingDraft;
  if (draft.version !== 1 || draft.base?.id !== row.entryId || draft.base?.userId !== userId || !draft.pending) {
    throw new Error("This local draft could not be validated. It has not been removed.");
  }
  return draft;
}

export async function loadJournalDraft(userId: string, entryId: string): Promise<JournalPendingDraft | null> {
  const rows = (await listJournalDrafts(userId)).filter((row) => row.entryId === entryId);
  const row = rows.find((item) => item.writerId === journalDraftWriterId()) ?? rows[0];
  if (!row) return null;
  const draft = await decodeJournalDraft(row, userId);
  if (row.writerId !== journalDraftWriterId()) importedDrafts.set(journalDraftKey(userId, entryId), row);
  return draft;
}

/** Remove only the exact imported snapshot after cloud acknowledgement, never a
 * newer draft still being edited in the other tab. Both checks share one transaction. */
async function clearExactImportedDraft(imported: JournalDraftEnvelope): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const read = store.get(imported.key);
      read.onsuccess = () => {
        const row = read.result as JournalDraftEnvelope | undefined;
        if (row?.content === imported.content && row.updatedAt === imported.updatedAt && row.userId === imported.userId) store.delete(imported.key);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("Could not acknowledge the recovered journal draft."));
      tx.onerror = () => reject(tx.error ?? new Error("Could not acknowledge the recovered journal draft."));
    });
  } finally { db.close(); }
}
