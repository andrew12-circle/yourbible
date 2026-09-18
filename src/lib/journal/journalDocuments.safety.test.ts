import { IDBFactory } from "fake-indexeddb";
import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { JournalSafetyDb } from "@/test/journalSafetyDb";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { createLocalJournalDocument, openJournalDocument, patchJournalDocument, peekJournalDocument, deleteJournalDocument } from "./journalDocuments";
import { listJournalDrafts, journalEntryWasDeleted, loadJournalDraft } from "./journalDraftStorage";
const h = vi.hoisted(() => ({ db: null as unknown as import("@/test/journalSafetyDb").JournalSafetyDb, read: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } }, error: null }) },
  from: (table: string) => h.db.from(table), storage: { from: () => ({ remove: h.remove }) },
} }));
vi.mock("./journalEntryDb", () => ({ fetchJournalEntryDetail: h.read, insertJournalEntry: h.insert, updateJournalEntry: h.update }));
let count = 0;
let id = "";
beforeEach(async () => {
  // Dispose the previous test's document owners before replacing its storage.
  await useJournalVaultStore.getState().reset();
  vi.stubGlobal("indexedDB", new IDBFactory()); vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("BroadcastChannel", undefined);
  h.db = new JournalSafetyDb(); id = `entry-${++count}`; h.read.mockReset().mockResolvedValue(null); h.insert.mockReset(); h.update.mockReset(); h.remove.mockReset().mockResolvedValue({ error: null });
  useJournalVaultStore.setState({ dek: null, locking: false, e2eEnabled: false, e2eRequiredJournalIds: new Set() });
});
afterEach(async () => { await useJournalVaultStore.getState().reset(); vi.unstubAllGlobals(); });
const key = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
describe("journal document lock and deletion lifecycle", () => {
  it("protects the latest pending words before clearing decrypted queues and old handles", async () => {
    const dek = await key(); useJournalVaultStore.setState({ dek, e2eEnabled: true });
    const queue = createLocalJournalDocument("owner", id, { body: "Before", title: "Private" }, true);
    patchJournalDocument("owner", id, { body: "Latest private words" });
    await useJournalVaultStore.getState().lock();
    expect(useJournalVaultStore.getState().dek).toBeNull(); expect(peekJournalDocument("owner", id)).toBeUndefined();
    expect(JSON.stringify(queue.getState())).not.toContain("Latest private words");
    expect(() => queue.patch({ body: "stale" })).toThrow(); expect((await queue.flush()).ok).toBe(false);
    const [saved] = await listJournalDrafts("owner"); expect(saved.encrypted).toBe(true); expect(saved.content).not.toContain("Latest private words");
    await expect(openJournalDocument("owner", id)).rejects.toThrow("Unlock");
    useJournalVaultStore.getState().unlock(dek); const recovered = await openJournalDocument("owner", id);
    expect(recovered.current().values.body).toBe("Latest private words");
  });
  it("keeps the key and recoverable in-memory text when durable local persistence fails", async () => {
    const dek = await key(); useJournalVaultStore.setState({ dek, e2eEnabled: true });
    const queue = createLocalJournalDocument("owner", id, { body: "Do not lose this" }, true); await queue.persist();
    const real = indexedDB; vi.stubGlobal("indexedDB", { open: () => { throw new Error("disk full"); } });
    await expect(useJournalVaultStore.getState().lock()).rejects.toThrow("disk full");
    expect(useJournalVaultStore.getState().dek).toBe(dek); expect(queue.current().values.body).toBe("Do not lose this");
    expect(() => queue.patch({ body: "Still editable" })).not.toThrow(); vi.stubGlobal("indexedDB", real); await queue.persist();
  });
  it("rejects an opening request that finishes after lock", async () => {
    const remote = deferred<unknown>(); h.read.mockReturnValue(remote.promise);
    const opening = openJournalDocument("owner", id); await vi.waitFor(() => expect(h.read).toHaveBeenCalled());
    await useJournalVaultStore.getState().lock();
    remote.resolve({ id, user_id: "owner", revision: 1, body: "late private content", e2e_encrypted: false });
    await expect(opening).rejects.toThrow("access changed"); expect(peekJournalDocument("owner", id)).toBeUndefined();
  });
  it("does not delete locally or pretend success when the server rejects deletion", async () => {
    h.db.rows.set("journal_entries", [{ id, user_id: "owner", revision: 1 }]);
    const queue = createLocalJournalDocument("owner", id, { body: "Keep my text" }); await queue.persist();
    h.db.fail = (request) => request.action === "delete" ? new Error("delete denied") : null;
    await expect(deleteJournalDocument("owner", id)).rejects.toThrow("delete denied");
    expect(peekJournalDocument("owner", id)).toBe(queue); expect(queue.current().values.body).toBe("Keep my text");
    expect(await journalEntryWasDeleted("owner", id)).toBe(false); expect(await loadJournalDraft("owner", id)).not.toBeNull();
  });
  it("clears all stale draft handles only after confirmed deletion and blocks resurrection", async () => {
    h.db.rows.set("journal_entries", [{ id, user_id: "owner", revision: 1 }]);
    const queue = createLocalJournalDocument("owner", id, { body: "Discard only after confirmed delete" }); await queue.persist();
    await deleteJournalDocument("owner", id);
    expect(await journalEntryWasDeleted("owner", id)).toBe(true); expect(await listJournalDrafts("owner")).toEqual([]);
    expect(peekJournalDocument("owner", id)).toBeUndefined(); expect(() => queue.patch({ body: "resurrect" })).toThrow();
    await expect(openJournalDocument("owner", id)).rejects.toThrow(); expect(h.db.rows.get("journal_entries")).toEqual([]);
  });
  it("verifies a deletion whose success response was lost", async () => {
    h.db.rows.set("journal_entries", [{ id, user_id: "owner", revision: 1 }]);
    h.db.after = (request) => request.action === "delete" ? new Error("response lost") : null;
    await deleteJournalDocument("owner", id);
    expect(await journalEntryWasDeleted("owner", id)).toBe(true); expect(h.db.calls.filter((r) => r.action === "delete")).toHaveLength(1);
  });
  it("awaits an in-flight acknowledgement and preserves a newer edit during lock", async () => {
    const dek = await key(); useJournalVaultStore.setState({ dek, e2eEnabled: true });
    const response = deferred<unknown>(); h.insert.mockReturnValue(response.promise);
    const queue = createLocalJournalDocument("owner", id, { body: "Before network request", title: "Private" }, true);
    const saving = queue.flush(); await vi.waitFor(() => expect(h.insert).toHaveBeenCalled());
    queue.patch({ body: "Newer words typed during network request" });
    const locking = useJournalVaultStore.getState().lock();
    expect(useJournalVaultStore.getState().locking).toBe(true); expect(useJournalVaultStore.getState().dek).toBe(dek);
    response.resolve({ data: { id, user_id: "owner", revision: 1, body: "Before network request", title: "Private", e2e_encrypted: false }, error: null });
    await saving; await locking;
    expect(useJournalVaultStore.getState().dek).toBeNull();
    useJournalVaultStore.getState().unlock(dek);
    expect((await openJournalDocument("owner", id)).current().values.body).toBe("Newer words typed during network request");
  });
  it("does not perform a remote deletion when local intent cannot be made durable", async () => {
    h.db.rows.set("journal_entries", [{ id, user_id: "owner", revision: 1 }]);
    const storage = indexedDB; vi.stubGlobal("indexedDB", { open: () => { throw new Error("no local storage"); } });
    await expect(deleteJournalDocument("owner", id)).rejects.toThrow("no local storage");
    expect(h.db.calls.some((request) => request.action === "delete")).toBe(false);
    vi.stubGlobal("indexedDB", storage);
  });
  it("keeps uncertain deletion blocked until reconnect verifies the entry, then resumes its draft", async () => {
    h.db.rows.set("journal_entries", [{ id, user_id: "owner", revision: 1 }]);
    const queue = createLocalJournalDocument("owner", id, { body: "Retained through uncertain delete" }); await queue.persist();
    let attempted = false;
    h.db.fail = (request) => { if (request.action === "delete") { attempted = true; return new Error("offline"); } return attempted ? new Error("still offline") : null; };
    await expect(deleteJournalDocument("owner", id)).rejects.toThrow("could not be confirmed");
    expect(await listJournalDrafts("owner")).toHaveLength(1); expect(() => queue.patch({ body: "blocked" })).toThrow();
    h.db.fail = undefined;
    const reopened = await openJournalDocument("owner", id);
    expect(reopened).toBe(queue); expect(() => reopened.patch({ body: "Resumed after verification" })).not.toThrow();
  });

});
