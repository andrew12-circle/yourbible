import { withJournalEntryLock } from "./journalMutationLock";
import { prepareJournalEntryCleanup, retryJournalAttachmentOperation, cancelJournalEntryCleanup } from "./journalAttachmentOperations";
import { supabase } from "@/integrations/supabase/client";
import { decryptJournalRow } from "./journalEntryCrypto";
import { journalEntryMustEncrypt } from "./journalE2ePolicy";
import { fetchJournalEntryDetail, insertJournalEntry, updateJournalEntry, type JournalEntryRecord } from "./journalEntryDb";
import { registerJournalPrivacyGuard } from "./journalPrivacyLifecycle";
import { getJournalDek, useJournalVaultStore } from "@/stores/journalVaultStore";
import { loadJournalDraft, persistJournalDraft, journalEntryWasDeleted, recordJournalEntryDeletion, stageJournalEntryDeletion, isJournalDeletionPending, cancelJournalDeletionIntent } from "./journalDraftStorage";
import { JournalConflictError, JournalSaveQueue, journalChangedFields, type JournalSnapshot, type JournalValues, type JournalFlushResult } from "./journalSaveQueue";

export const JOURNAL_DOCUMENT_CHANGED = "yourbible:journal-document-changed";
const WRITABLE = ["title", "body", "summary", "mood", "tags", "entry_at_ts", "entry_at", "pinned", "analyze_for_mirror", "journal_id", "location_name", "weather", "weather_temp_c", "weather_icon", "entry_kind", "lat", "lng", "verse_ref", "belief_id", "prompt_id"] as const;
const editorSync = new Map<string, Set<() => void>>();
const queues = new Map<string, JournalSaveQueue>();
const opening = new Map<string, Promise<JournalSaveQueue>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let accessGeneration = 0;
const deleting = new Set<string>();
const deleted = new Set<string>();
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
function assertReadable(snapshot: JournalSnapshot): void {
  if (useJournalVaultStore.getState().locking || deleting.has(keyFor(snapshot.userId, snapshot.id)) || deleted.has(keyFor(snapshot.userId, snapshot.id))) {
    throw new Error("This journal entry is being closed or deleted.");
  }
  if ((snapshot.encrypted || journalEntryMustEncrypt(snapshot.values.journal_id as string | null)) && !getJournalDek()) {
    throw new Error("Unlock your journal before opening this entry.");
  }
}
async function reconcileDeletionIntent(userId: string, entryId: string): Promise<void> {
  if (!(await isJournalDeletionPending(userId, entryId))) return;
  await withJournalEntryLock(userId, entryId, async () => {
    if (!(await isJournalDeletionPending(userId, entryId))) return;
    await assertUser(userId);
    const { data, error } = await supabase.from("journal_entries").select("id").eq("id", entryId).eq("user_id", userId).maybeSingle();
    if (error) throw new Error("An interrupted deletion needs verification. Reconnect and reopen this entry.");
    if (data) {
      await cancelJournalDeletionIntent(userId, entryId);
      queues.get(keyFor(userId, entryId))?.resume();
      await cancelJournalEntryCleanup(userId, entryId);
    } else {
      await recordJournalEntryDeletion(userId, entryId);
      const key = keyFor(userId, entryId), queue = queues.get(key);
      deleted.add(key); queues.delete(key); editorSync.delete(key); queue?.dispose();
    }
  });
}
function announce(userId: string, entryId: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(JOURNAL_DOCUMENT_CHANGED, { detail: { userId, entryId } }));
}
function register(base: JournalSnapshot, pending: JournalValues = {}): JournalSaveQueue {
  const { userId, id: entryId } = base;
  const key = keyFor(userId, entryId);
  assertReadable(base);
  const queue = new JournalSaveQueue(base, {
    persist: (draft) => persistJournalDraft(userId, entryId, draft),
    read: async () => {
      await assertUser(userId);
      const row = await fetchJournalEntryDetail(entryId, userId);
      if (!row) throw new Error("This entry was deleted. Your local draft has been kept.");
      return journalSnapshotFromRow(row);
    },
    write: (observed, patch) => withJournalEntryLock(userId, entryId, async () => {
      await assertUser(userId);
      assertReadable(observed);
      if (await journalEntryWasDeleted(userId, entryId)) throw new Error("This journal entry was deleted.");
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
    }),
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
  if (useJournalVaultStore.getState().locking || deleting.has(key) || deleted.has(key)) throw new Error("This journal entry is unavailable while locking or deleting.");
  const generation = accessGeneration;
  const current = queues.get(key);
  if (current) {
    await reconcileDeletionIntent(userId, entryId);
    if (await journalEntryWasDeleted(userId, entryId)) throw new Error("This journal entry was deleted.");
    assertReadable(current.current()); return current;
  }
  const existing = opening.get(key);
  if (existing) return existing;
  const task = (async () => {
    await assertUser(userId);
    await reconcileDeletionIntent(userId, entryId);
    if (await journalEntryWasDeleted(userId, entryId)) throw new Error("This journal entry was deleted.");
    const draft = await loadJournalDraft(userId, entryId);
    let remote: JournalEntryRecord | null = null;
    try { remote = await fetchJournalEntryDetail(entryId, userId); }
    catch (error) { if (!draft) throw error; }
    if (generation !== accessGeneration || useJournalVaultStore.getState().locking) throw new Error("Journal access changed while opening this entry.");
    if (remote?.contentLocked) throw new Error("Unlock your journal to read or recover this entry.");
    if (!remote && !draft) throw new Error("This journal entry could not be found.");
    const queue = register(draft?.base ?? journalSnapshotFromRow(remote!), draft?.pending);
    if (remote && draft) queue.acceptRemote(journalSnapshotFromRow(remote));
    return queue;
  })().finally(() => { if (opening.get(key) === task) opening.delete(key); });
  opening.set(key, task);
  return task;
}

export function createLocalJournalDocument(userId: string, entryId: string, values: JournalValues, encryptionRequired = false): JournalSaveQueue {
  if (useJournalVaultStore.getState().locking || deleting.has(keyFor(userId, entryId)) || deleted.has(keyFor(userId, entryId))) throw new Error("This journal document is closed.");
  const existing = queues.get(keyFor(userId, entryId));
  if (existing) { assertReadable(existing.current()); return existing; }
  return register({
    id: entryId, userId, revision: null, values,
    encrypted: encryptionRequired || journalEntryMustEncrypt(values.journal_id as string | null),
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
  if (queue) assertReadable(queue.current());
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
  assertReadable(queue.current());
  return journalSnapshotRow(queue.current());
}
export function retryJournalDocuments(userId: string): void {
  for (const queue of queues.values()) {
    const state = queue.getState();
    if (state.snapshot.userId === userId && queue.isDirty() && state.status !== "conflict") void queue.flush();
  }
}


/** Freeze edits, await existing writes, and durably encrypt pending text before forgetting it. */
registerJournalPrivacyGuard(async () => {
  accessGeneration += 1;
  const captured = [...queues.entries()];
  for (const [key, queue] of captured) {
    const snapshot = queue.current();
    synchronizeJournalEditors(snapshot.userId, snapshot.id);
    clearTimeout(timers.get(key)); timers.delete(key);
    queue.pause();
  }
  try {
    await Promise.all(captured.map(async ([, queue]) => { await queue.waitForIdle(); await queue.persist(); }));
  } catch (error) {
    for (const [, queue] of captured) queue.resume();
    throw error;
  }
  for (const [key, queue] of captured) {
    queues.delete(key);
    editorSync.delete(key);
    queue.dispose();
  }
  opening.clear();
});

/** Deletion waits for writes and retains durable intent through ambiguous network failures. */
export async function deleteJournalDocument(userId: string, entryId: string): Promise<void> {
  const key = keyFor(userId, entryId);
  if (deleting.has(key)) throw new Error("Deletion is already in progress.");
  await assertUser(userId);
  const queue = queues.get(key);
  synchronizeJournalEditors(userId, entryId);
  deleting.add(key);
  clearTimeout(timers.get(key)); timers.delete(key);
  queue?.pause();
  let uncertain = false;
  try {
    await queue?.waitForIdle();
    await withJournalEntryLock(userId, entryId, async () => {
      const readEntry = () => supabase.from("journal_entries").select("id,revision")
        .eq("id", entryId).eq("user_id", userId).maybeSingle();
      const { data: existing, error: readError } = await readEntry();
      if (readError) throw readError;
      const cleanup = await prepareJournalEntryCleanup(userId, entryId);
      // Failing local storage stops BEFORE any remote destructive request.
      await stageJournalEntryDeletion(userId, entryId);
      if (existing) {
        await assertUser(userId);
        const { data, error } = await supabase.from("journal_entries").delete()
          .eq("id", entryId).eq("user_id", userId).eq("revision", existing.revision).select("id").maybeSingle();
        if (error || !data) {
          const verified = await readEntry();
          if (verified.error) { uncertain = true; throw new Error("Deletion could not be confirmed. Your local copy is retained; retry when connected."); }
          if (verified.data) {
            await cancelJournalDeletionIntent(userId, entryId);
            throw error ?? new Error("This entry changed while deleting. Review it and retry.");
          }
        }
      }
      deleted.add(key);
      queues.delete(key); editorSync.delete(key);
      queue?.dispose();
      // A quota failure after confirmation leaves the durable pending marker in
      // place. It still blocks stale writes; reopening verifies/removes leftovers.
      await recordJournalEntryDeletion(userId, entryId).catch((error) => console.warn("Deleted entry cleanup awaits retry", error));
      await Promise.all(cleanup.map((op) => retryJournalAttachmentOperation(op).catch(() => {})));
      window.dispatchEvent(new CustomEvent("yourbible:journal-entry-deleted", { detail: { userId, entryId } }));
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("yourbible:journal-deletions");
        channel.postMessage({ userId, entryId }); channel.close();
      }
    });
  } catch (error) {
    if (!deleted.has(key) && !uncertain) {
      queue?.resume();
      await cancelJournalEntryCleanup(userId, entryId).catch(() => {});
    }
    throw error;
  } finally { deleting.delete(key); }
}

if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  const channel = new BroadcastChannel("yourbible:journal-deletions");
  channel.onmessage = (event: MessageEvent<{ userId?: string; entryId?: string }>) => {
    const { userId, entryId } = event.data ?? {};
    if (!userId || !entryId) return;
    void (async () => {
      if (!(await journalEntryWasDeleted(userId, entryId))) return;
      const key = keyFor(userId, entryId), queue = queues.get(key);
      deleted.add(key); clearTimeout(timers.get(key)); timers.delete(key);
      queue?.pause(); queues.delete(key); editorSync.delete(key);
      // Hide the deleted entry immediately; discard queue internals after an old write settles.
      window.dispatchEvent(new CustomEvent("yourbible:journal-entry-deleted", { detail: { userId, entryId } }));
      await queue?.waitForIdle(); queue?.dispose();
    })().catch(() => {});
  };
}
