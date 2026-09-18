import { withJournalEntryLock } from "./journalMutationLock";
import { supabase } from "@/integrations/supabase/client";
import { journalEntryWasDeleted } from "./journalDraftStorage";

export type JournalPhoto = { id: string; storage_path: string; url?: string };
export type AttachmentOperation = {
  id: string; userId: string; entryId: string;
  kind: "upload" | "remove" | "entry-cleanup";
  table: "journal_photos" | "journal_videos";
  attachmentId: string; path: string; file?: File;
  phase: "metadata" | "storage";
  error?: string;
  digest?: string;
  createdAt?: number;
};
export const JOURNAL_ATTACHMENT_CHANGED = "yourbible:journal-attachment-operations";
const flights = new Map<string, Promise<JournalPhoto | null>>();
const database = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("yb_journal_attachment_operations_v1", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("operations", { keyPath: "id" });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Attachment recovery storage is unavailable."));
});
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("operations", mode), request = run(tx.objectStore("operations"));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error ?? request.error ?? new Error("Could not preserve the attachment operation."));
    });
  } finally { db.close(); }
}
async function remember(operation: AttachmentOperation): Promise<void> {
  await transaction("readwrite", (store) => store.put({ ...operation, createdAt: operation.createdAt ?? Date.now() }));
  window.dispatchEvent(new Event(JOURNAL_ATTACHMENT_CHANGED));
}
async function forget(id: string): Promise<void> {
  await transaction("readwrite", (store) => store.delete(id));
  window.dispatchEvent(new Event(JOURNAL_ATTACHMENT_CHANGED));
}
export async function listJournalAttachmentOperations(userId: string): Promise<AttachmentOperation[]> {
  const all = await transaction<AttachmentOperation[]>("readonly", (store) => store.getAll());
  return all.filter((op) => op.userId === userId);
}
async function owner(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== userId) throw new Error("Sign in to the account that owns this attachment.");
}
function bucket(op: AttachmentOperation) { return op.table === "journal_photos" ? "journal-photos" : "journal-videos"; }
function message(error: unknown) { return error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error); }

export async function stageJournalPhoto(userId: string, entryId: string, file: File): Promise<AttachmentOperation> {
  await owner(userId);
  if (await journalEntryWasDeleted(userId, entryId)) throw new Error("This entry was deleted.");
  const bytes = await file.arrayBuffer();
  const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const pending = (await listJournalAttachmentOperations(userId)).find((item) =>
    item.kind === "upload" && item.entryId === entryId && item.digest === digest);
  if (pending) return pending;
  const id = crypto.randomUUID();
  const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const ext = /^(jpg|jpeg|png|webp|heic|gif)$/.test(extension) ? extension : "jpg";
  const operation: AttachmentOperation = { id, userId, entryId, attachmentId: id, kind: "upload", table: "journal_photos",
    path: `${userId}/${entryId}/${id}.${ext}`, file, digest, createdAt: Date.now(), phase: "metadata" };
  await remember(operation); // File and stable identities survive reload before any network side effect.
  return operation;
}

async function perform(op: AttachmentOperation): Promise<JournalPhoto | null> {
  await owner(op.userId);
  const selection = () => supabase.from(op.table).select("id,storage_path")
    .eq("id", op.attachmentId).eq("entry_id", op.entryId).eq("user_id", op.userId).maybeSingle();
  if (op.kind === "upload") {
    if (await journalEntryWasDeleted(op.userId, op.entryId)) throw new Error("The entry was deleted; discard this pending photo instead of uploading it.");
    const { data: existing, error: readError } = await selection();
    if (readError) throw readError;
    if (existing) {
      if (existing.storage_path !== op.path) throw new Error("Attachment identity mismatch.");
      await forget(op.id); return existing;
    }
    if (!op.file) throw new Error("The local photo is missing. Select it again.");
    await owner(op.userId);
    const { error: uploadError } = await supabase.storage.from(bucket(op)).upload(op.path, op.file, { upsert: true, contentType: op.file.type || "image/jpeg" });
    if (uploadError) throw uploadError;
    await owner(op.userId);
    if (await journalEntryWasDeleted(op.userId, op.entryId)) throw new Error("The entry was deleted; discard the pending photo.");
    const { data, error } = await supabase.from("journal_photos").upsert({ id: op.attachmentId, user_id: op.userId,
      entry_id: op.entryId, storage_path: op.path }, { onConflict: "id", ignoreDuplicates: true }).select("id,storage_path").maybeSingle();
    if (error) throw error;
    const confirmed = data ?? (await selection()).data;
    if (!confirmed || confirmed.storage_path !== op.path) throw new Error("Photo upload is retained, but the entry attachment was not confirmed. Retry attachment.");
    await forget(op.id);
    return confirmed;
  }
  if (op.kind === "entry-cleanup") {
    const { data, error } = await supabase.from("journal_entries").select("id").eq("id", op.entryId).eq("user_id", op.userId).maybeSingle();
    if (error) throw error;
    if (data) throw new Error("Entry deletion was not confirmed; its files have been retained.");
  } else if (op.phase === "metadata") {
    const { data: existing, error: readError } = await selection();
    if (readError) throw readError;
    if (existing) {
      if (existing.storage_path !== op.path) throw new Error("Attachment changed before removal. Reload and retry.");
      const { data, error } = await supabase.from(op.table).delete().eq("id", op.attachmentId)
        .eq("entry_id", op.entryId).eq("user_id", op.userId).eq("storage_path", op.path).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Attachment removal was not confirmed. Retry removal.");
    }
    op = { ...op, phase: "storage" };
    await remember(op); // Only confirmed database removal permits storage cleanup.
  }
  await owner(op.userId);
  const { error } = await supabase.storage.from(bucket(op)).remove([op.path]);
  if (error) throw error;
  await forget(op.id);
  return null;
}
export function retryJournalAttachmentOperation(op: AttachmentOperation): Promise<JournalPhoto | null> {
  const active = flights.get(op.id);
  if (active) return active;
  const execute = async () => {
    const current = (await listJournalAttachmentOperations(op.userId)).find((item) => item.id === op.id);
    if (!current) return null;
    try { return await (current.kind === "entry-cleanup" ? perform(current) : withJournalEntryLock(current.userId, current.entryId, () => perform(current))); }
    catch (error) {
      // Reload phase after a successful DB removal followed by failed storage cleanup.
      const stored = (await listJournalAttachmentOperations(op.userId)).find((item) => item.id === op.id);
      if (stored) await remember({ ...stored, error: message(error) });
      throw error;
    }
  };
  const run = typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request(`journal-attachment:${op.id}`, execute) : execute();
  const flight = run.finally(() => { flights.delete(op.id); });
  flights.set(op.id, flight);
  return flight;
}

export async function removeJournalAttachment(userId: string, entryId: string, id: string, table: AttachmentOperation["table"]): Promise<void> {
  await owner(userId);
  const pending = (await listJournalAttachmentOperations(userId)).find((op) => op.kind === "remove" && op.attachmentId === id && op.entryId === entryId);
  if (pending) {
    try { await retryJournalAttachmentOperation(pending); }
    catch (error) {
      const retained = (await listJournalAttachmentOperations(userId)).find((item) => item.id === pending.id);
      if (retained?.phase !== "storage") throw error;
    }
    return;
  }
  const { data, error } = await supabase.from(table).select("id,storage_path").eq("id", id).eq("entry_id", entryId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return;
  const op: AttachmentOperation = { id: crypto.randomUUID(), userId, entryId, attachmentId: id, table, path: data.storage_path, kind: "remove", phase: "metadata" };
  await remember(op);
  try { await retryJournalAttachmentOperation(op); }
  catch (error) {
    const retained = (await listJournalAttachmentOperations(userId)).find((item) => item.id === op.id);
    if (retained?.phase !== "storage") throw error;
    // Removed from the entry; storage cleanup is durably queued and visible in recovery.
  }
}

/** Capture file cleanup intent before a cascading entry deletion; never delete a still-attached file. */
export async function prepareJournalEntryCleanup(userId: string, entryId: string): Promise<AttachmentOperation[]> {
  await owner(userId);
  const operations: AttachmentOperation[] = [];
  for (const table of ["journal_photos", "journal_videos"] as const) {
    const { data, error } = await supabase.from(table).select("id,storage_path").eq("entry_id", entryId).eq("user_id", userId);
    if (error) throw error;
    for (const row of data ?? []) {
      const op: AttachmentOperation = { id: `entry-cleanup:${table}:${row.id}`, kind: "entry-cleanup", userId, entryId,
        table, attachmentId: row.id, path: row.storage_path, phase: "storage" };
      await remember(op); operations.push(op);
    }
  }
  return operations;
}
export async function discardPendingJournalPhoto(op: AttachmentOperation): Promise<void> {
  if (op.kind !== "upload") throw new Error("Only pending uploads can be discarded.");
  await owner(op.userId);
  const { data, error } = await supabase.from("journal_photos").select("id").eq("id", op.attachmentId).eq("user_id", op.userId).maybeSingle();
  if (error) throw error;
  if (data) throw new Error("This photo was attached. Retry to recover it, then remove it from the entry.");
  const { error: storageError } = await supabase.storage.from("journal-photos").remove([op.path]);
  if (storageError) throw storageError;
  await forget(op.id);
}

/** A rejected entry deletion must not leave misleading file-cleanup jobs behind. */
export async function cancelJournalEntryCleanup(userId: string, entryId: string): Promise<void> {
  const operations = await listJournalAttachmentOperations(userId);
  await Promise.all(operations.filter((op) => op.entryId === entryId && op.kind === "entry-cleanup").map((op) => forget(op.id)));
}
