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
    const request = indexedDB.open(DATABASE, 3);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" });
      if (!request.result.objectStoreNames.contains("deletedEntries")) request.result.createObjectStore("deletedEntries");
      if (!request.result.objectStoreNames.contains("aiUndo")) request.result.createObjectStore("aiUndo", { keyPath: "key" });
    };
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
  if (draft && await journalEntryWasDeleted(userId, entryId)) throw new Error("This entry was deleted. Its draft cannot be saved again.");
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
    const db = await database();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE, "deletedEntries"], "readwrite");
        const marker = tx.objectStore("deletedEntries").get(`${userId}:${entryId}`);
        marker.onsuccess = () => { if (marker.result) tx.abort(); else tx.objectStore(STORE).put(envelope); };
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("The entry is being deleted; the draft was not recreated."));
      });
    } finally { db.close(); }
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
    if (getJournalDek() !== dek) throw new Error("Journal was locked while recovering this draft.");
  }
  const draft = JSON.parse(text) as JournalPendingDraft;
  if (draft.version !== 1 || draft.base?.id !== row.entryId || draft.base?.userId !== userId || !draft.pending) {
    throw new Error("This local draft could not be validated. It has not been removed.");
  }
  return draft;
}

export async function loadJournalDraft(userId: string, entryId: string): Promise<JournalPendingDraft | null> {
  if (await journalEntryWasDeleted(userId, entryId)) return null;
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

/** Durable tombstones prevent deleted entries being recreated from an old tab or draft. */
export async function journalEntryWasDeleted(userId: string, entryId: string): Promise<boolean> {
  const db = await database();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const read = db.transaction("deletedEntries").objectStore("deletedEntries").get(`${userId}:${entryId}`);
      read.onsuccess = () => resolve(Boolean(read.result));
      read.onerror = () => reject(read.error);
    });
  } finally { db.close(); }
}
export async function recordJournalEntryDeletion(userId: string, entryId: string): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE, "deletedEntries", "aiUndo"], "readwrite");
      tx.objectStore("deletedEntries").put(Date.now(), `${userId}:${entryId}`);
      for (const storeName of [STORE, "aiUndo"]) {
      const cursor = tx.objectStore(storeName).openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) return;
        const value = row.value as JournalDraftEnvelope;
        if (value.userId === userId && value.entryId === entryId) row.delete();
        row.continue();
      };
      }
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Could not remove deleted journal drafts."));
    });
    window.dispatchEvent(new Event(JOURNAL_DRAFT_CHANGED));
  } finally { db.close(); }
}

/** Upgrade drafts and AI undo originals; re-read until no plaintext remains. */
export async function encryptPlaintextJournalDrafts(userId: string, dek: CryptoKey): Promise<void> {
  for (const storeName of [STORE, "aiUndo"]) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const db = await database();
      let rows: JournalDraftEnvelope[];
      try {
        rows = await new Promise<JournalDraftEnvelope[]>((resolve, reject) => {
          const request = db.transaction(storeName).objectStore(storeName).getAll();
          request.onsuccess = () => resolve(request.result.filter((row: JournalDraftEnvelope) => row.userId === userId && !row.encrypted));
          request.onerror = () => reject(request.error);
        });
      } finally { db.close(); }
      if (!rows.length) break;
      if (attempt === 7) throw new Error("Device drafts are still changing. Finish encryption after other editing stops.");
      for (const row of rows) {
        const content = (await encryptTextField(dek, row.content))!;
        const db = await database();
        try {
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, "readwrite"), store = tx.objectStore(storeName);
            const read = store.get(row.key);
            read.onsuccess = () => {
              const current = read.result as JournalDraftEnvelope | undefined;
              if (current && current.content === row.content && current.updatedAt === row.updatedAt) store.put({ ...row, encrypted: true, content });
            };
            tx.oncomplete = () => resolve();
            tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Could not protect existing device drafts."));
          });
        } finally { db.close(); }
      }
    }
  }
  importedDrafts.clear(); // Do not retain pre-migration plaintext envelopes in memory.
}

export type JournalAiEdit = { key: string; before: string; after: string; field: string; updatedAt: string };
/** Persist the complete original before replacing text. Failed backup means no AI edit. */
export async function preserveJournalAiEdit(userId: string, entryId: string, field: string, before: string, after: string): Promise<JournalAiEdit> {
  const edit: JournalAiEdit = { key: `${userId}:${entryId}:${crypto.randomUUID()}`, before, after, field, updatedAt: new Date().toISOString() };
  const dek = getJournalDek();
  if (journalEntryMustEncrypt(null) && !dek) throw new Error("Unlock the journal before protecting its edit history.");
  const encoded = JSON.stringify(edit);
  const envelope = { key: edit.key, userId, entryId, field, updatedAt: edit.updatedAt, encrypted: Boolean(dek),
    content: dek ? (await encryptTextField(dek, encoded))! : encoded };
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["aiUndo", "deletedEntries"], "readwrite"), store = tx.objectStore("aiUndo");
      const marker = tx.objectStore("deletedEntries").get(`${userId}:${entryId}`);
      marker.onsuccess = () => {
        if (marker.result) { tx.abort(); return; }
        store.put(envelope);
        const read = store.getAll();
        read.onsuccess = () => {
          const rows = (read.result as typeof envelope[]).filter((row) => row.userId === userId && row.entryId === entryId && row.field === field)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          for (const row of rows.slice(20)) store.delete(row.key);
        };
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("The original text could not be backed up. AI changes were not applied."));
    });
  } finally { db.close(); }
  return edit;
}
export async function loadJournalAiEdits(userId: string, entryId: string, field: string): Promise<JournalAiEdit[]> {
  const db = await database();
  let rows: (JournalDraftEnvelope & { field: string })[];
  try {
    rows = await new Promise((resolve, reject) => {
      const request = db.transaction("aiUndo").objectStore("aiUndo").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
  const dek = getJournalDek();
  const result: JournalAiEdit[] = [];
  for (const row of rows.filter((item) => item.userId === userId && item.entryId === entryId && item.field === field)) {
    if (row.encrypted && !dek) continue;
    const text = row.encrypted ? await decryptTextField(dek!, row.content) : row.content;
    if (getJournalDek() !== dek) throw new Error("Journal was locked while reading edit history.");
    const edit = JSON.parse(text!) as JournalAiEdit;
    if (edit.key === row.key && typeof edit.before === "string" && typeof edit.after === "string") result.push(edit);
  }
  return result.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

/** Record intent before remote deletion; no drafts are discarded until confirmation. */
export async function stageJournalEntryDeletion(userId: string, entryId: string): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("deletedEntries", "readwrite");
      tx.objectStore("deletedEntries").put({ pending: true, at: Date.now() }, `${userId}:${entryId}`);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error("Deletion recovery could not be prepared. Nothing was deleted."));
    });
  } finally { db.close(); }
}
export async function isJournalDeletionPending(userId: string, entryId: string): Promise<boolean> {
  const db = await database();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const request = db.transaction("deletedEntries").objectStore("deletedEntries").get(`${userId}:${entryId}`);
      request.onsuccess = () => resolve(request.result?.pending === true);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function cancelJournalDeletionIntent(userId: string, entryId: string): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("deletedEntries", "readwrite"), store = tx.objectStore("deletedEntries");
      const read = store.get(`${userId}:${entryId}`);
      read.onsuccess = () => { if (read.result?.pending) store.delete(`${userId}:${entryId}`); };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
