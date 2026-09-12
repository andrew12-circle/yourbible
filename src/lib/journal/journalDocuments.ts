import { supabase } from "@/integrations/supabase/client";
import { decryptJournalRow } from "./journalEntryCrypto";
import { journalEntryMustEncrypt } from "./journalE2ePolicy";
import { fetchJournalEntryDetail, insertJournalEntry, updateJournalEntry, type JournalEntryRecord } from "./journalEntryDb";
import { loadJournalDraft, persistJournalDraft } from "./journalDraftStorage";
import { JournalConflictError, JournalSaveQueue, journalChangedFields, type JournalSnapshot, type JournalValues, type JournalFlushResult } from "./journalSaveQueue";

export const JOURNAL_DOCUMENT_CHANGED = "yourbible:journal-document-changed";
const WRITABLE = ["title", "body", "summary", "mood", "tags", "entry_at_ts", "entry_at", "pinned", "analyze_for_mirror", "journal_id", "location_name", "weather", "weather_temp_c", "weather_icon", "entry_kind", "lat", "lng", "verse_ref", "belief_id", "prompt_id"] as const;
const editorSync = new Map<string, Set<() => void>>();
const queues = new Map<string, JournalSaveQueue>();
const opening = new Map<string, Promise<JournalSaveQueue>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const keyFor = (userId: string, entryId: string) => `${userId}:${entryId}`;

export function registerJournalEditorSync(userId: string, entryId: string, sync: () => void): () => void {
  const key = keyFor(userId, entryId);
  const set = editorSync.get(key) ?? new Set<() => void>();
  editorSync.set(key, set); set.add(sync);
  return () => { set.delete(sync); if (!set.size) editorSync.delete(key); };
}
export function synchronizeJournalEditors(userId: string, entryId: string): void {
  for (const sync of editorSync.get(keyFor(userId, entryId)) ?? []) sync();
}

export function journalSnapshotFromRow(row: JournalEntryRecord): JournalSnapshot {
  if (row.contentLocked) throw new Error("Unlock your journal before opening this entry for editing.");
  const values = Object.fromEntries(WRITABLE.filter((key) => row[key] !== undefined).map((key) => [key, row[key]]));
  if (typeof values.entry_at_ts === "string") values.entry_at_ts = new Date(values.entry_at_ts).toISOString();
  return { id: row.id, userId: row.user_id, revision: row.revision, encrypted: row.e2e_encrypted, values };
}
export function journalSnapshotRow(snapshot: JournalSnapshot): JournalEntryRecord {
  return { ...snapshot.values, id: snapshot.id, user_id: snapshot.userId, revision: snapshot.revision,
    e2e_encrypted: snapshot.encrypted, contentLocked: false } as JournalEntryRecord;
}
async function assertUser(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.user.id !== userId) throw new Error("Sign in to the account that owns this journal draft to finish saving.");
}
function announce(userId: string, entryId: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(JOURNAL_DOCUMENT_CHANGED, { detail: { userId, entryId } }));
}
function register(base: JournalSnapshot, pending: JournalValues = {}): JournalSaveQueue {
  const { userId, id: entryId } = base;
  const key = keyFor(userId, entryId);
  const queue = new JournalSaveQueue(base, {
    persist: (draft) => persistJournalDraft(userId, entryId, draft),
    read: async () => {
      await assertUser(userId);
      const row = await fetchJournalEntryDetail(entryId, userId);
      if (!row) throw new Error("This entry was deleted. Your local draft has been kept.");
      return journalSnapshotFromRow(row);
    },
    write: async (observed, patch) => {
      await assertUser(userId);
      if (observed.revision === null) {
        const complete = { ...observed.values, ...patch };
        const { data, error } = await insertJournalEntry(userId, { ...complete, id: entryId });
        if (error?.code === "23505") {
          // A timed-out insert may already exist. Never insert with a second identity.
          const existing = await fetchJournalEntryDetail(entryId, userId);
          if (!existing) throw error;
          const saved = journalSnapshotFromRow(existing);
          const changed = journalChangedFields(saved.values, complete);
          if (Object.keys(changed).length) throw new JournalConflictError();
          return saved;
        }
        if (error) throw error;
        if (!data) throw new Error("The server did not confirm creation of this entry.");
        return journalSnapshotFromRow(await decryptJournalRow(data));
      }
      const { data, error } = await updateJournalEntry(userId, entryId, patch, { expectedRevision: observed.revision });
      if (error) throw error;
      if (!data) throw new Error("The server did not confirm this journal save.");
      return journalSnapshotFromRow(data);
    },
  }, pending);
  queues.set(key, queue);
  queue.subscribe(() => announce(userId, entryId));
  announce(userId, entryId);
  if (queue.isDirty()) void queue.persist().catch(() => {});
  return queue;
}

/** A stable in-memory owner outlives each editor, while IndexedDB outlives the page. */
export async function openJournalDocument(userId: string, entryId: string): Promise<JournalSaveQueue> {
  const key = keyFor(userId, entryId);
  const current = queues.get(key);
  if (current) return current;
  const existing = opening.get(key);
  if (existing) return existing;
  const task = (async () => {
    const draft = await loadJournalDraft(userId, entryId);
    let remote: JournalEntryRecord | null = null;
    try { remote = await fetchJournalEntryDetail(entryId, userId); }
    catch (error) { if (!draft) throw error; }
    if (remote?.contentLocked) throw new Error("Unlock your journal to read or recover this entry.");
    if (!remote && !draft) throw new Error("This journal entry could not be found.");
    const queue = register(draft?.base ?? journalSnapshotFromRow(remote!), draft?.pending);
    if (remote && draft) queue.acceptRemote(journalSnapshotFromRow(remote));
    return queue;
  })().finally(() => { opening.delete(key); });
  opening.set(key, task);
  return task;
}

export function createLocalJournalDocument(userId: string, entryId: string, values: JournalValues): JournalSaveQueue {
  return queues.get(keyFor(userId, entryId)) ?? register({
    id: entryId, userId, revision: null, values,
    encrypted: journalEntryMustEncrypt(values.journal_id as string | null),
  });
}
export function peekJournalDocument(userId: string, entryId: string): JournalSaveQueue | undefined {
  return queues.get(keyFor(userId, entryId));
}
export async function loadJournalDocumentRow(userId: string, entryId: string): Promise<JournalEntryRecord> {
  return journalSnapshotRow((await openJournalDocument(userId, entryId)).current());
}
export function patchJournalDocument(userId: string, entryId: string, patch: JournalValues): JournalEntryRecord {
  const queue = peekJournalDocument(userId, entryId);
  if (!queue) throw new Error("Wait for this entry to finish opening before editing.");
  queue.patch(patch);
  const key = keyFor(userId, entryId);
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => { timers.delete(key); void queue.flush(); }, 600));
  return journalSnapshotRow(queue.current());
}
export async function flushJournalDocument(userId: string, entryId: string): Promise<JournalFlushResult> {
  const key = keyFor(userId, entryId);
  clearTimeout(timers.get(key));
  timers.delete(key);
  try { return await (await openJournalDocument(userId, entryId)).flush(); }
  catch (cause) { return { ok: false, entryId, error: cause instanceof Error ? cause : new Error(String(cause)) }; }
}
export async function refreshJournalDocument(userId: string, entryId: string): Promise<JournalEntryRecord> {
  const queue = await openJournalDocument(userId, entryId);
  synchronizeJournalEditors(userId, entryId);
  // Do not apply remote data in the middle of a local acknowledgement.
  await queue.flush();
  const remote = await fetchJournalEntryDetail(entryId, userId);
  if (remote) {
    synchronizeJournalEditors(userId, entryId);
    queue.acceptRemote(journalSnapshotFromRow(remote));
    await queue.persist();
  }
  return journalSnapshotRow(queue.current());
}
export function retryJournalDocuments(userId: string): void {
  for (const queue of queues.values()) {
    const state = queue.getState();
    if (state.snapshot.userId === userId && queue.isDirty() && state.status !== "conflict") void queue.flush();
  }
}
