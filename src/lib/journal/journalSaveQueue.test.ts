import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { JournalConflictError, JournalSaveQueue, type JournalSnapshot, type JournalPendingDraft, type JournalValues } from "./journalSaveQueue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const initial = (): JournalSnapshot => ({
  id: "entry-a", userId: "user-a", revision: 4, encrypted: false,
  values: { body: "Original", title: "Title", mood: null },
});
function harness(options: { initial?: JournalSnapshot; pending?: JournalValues; failLocal?: boolean } = {}) {
  let remote = structuredClone(options.initial ?? initial());
  let disk: JournalPendingDraft | null = null;
  let failure: Error | null = null;
  let gate: ReturnType<typeof deferred<void>> | null = null;
  let started = deferred<void>();
  const writes: { revision: number | null; patch: JournalValues }[] = [];
  const queue = new JournalSaveQueue(remote, {
    persist: async (draft) => {
      if (options.failLocal) throw new Error("Storage full");
      disk = structuredClone(draft);
    },
    read: async () => structuredClone(remote),
    write: async (base, patch) => {
      writes.push({ revision: base.revision, patch: structuredClone(patch) });
      const hold = gate; gate = null;
      started.resolve();
      if (hold) await hold.promise;
      if (failure) throw failure;
      if (base.revision !== remote.revision) throw new JournalConflictError();
      remote = { ...remote, revision: (remote.revision ?? -1) + 1,
        values: { ...remote.values, ...structuredClone(patch) } };
      return structuredClone(remote);
    },
  }, options.pending);
  return {
    queue, writes,
    disk: () => disk,
    remote: () => remote,
    setRemote: (row: JournalSnapshot) => { remote = structuredClone(row); },
    fail: (error: Error | null) => { failure = error; },
    blockNext: () => { gate = deferred<void>(); started = deferred<void>(); return { gate, started }; },
  };
}

describe("JournalSaveQueue behavioral regression", () => {
  it("retains a failed silent/background write and retries the same pending snapshot", async () => {
    const h = harness();
    h.queue.patch({ body: "Must survive" });
    h.fail(new Error("Network disconnected"));
    assert.equal((await h.queue.flush()).ok, false);
    assert.equal(h.disk()?.pending.body, "Must survive");
    assert.equal(h.queue.current().values.body, "Must survive");
    assert.equal(h.queue.getState().status, "error");
    h.fail(null);
    assert.equal((await h.queue.flush()).ok, true);
    assert.equal(h.remote().values.body, "Must survive");
    assert.equal(h.disk(), null);
  });

  it("serializes concurrent flushes and sends edits made while the first save is in flight", async () => {
    const h = harness();
    const { gate, started } = h.blockNext();
    h.queue.patch({ body: "First" });
    const a = h.queue.flush();
    const b = h.queue.flush();
    assert.equal(a, b);
    await started.promise;
    h.queue.patch({ body: "Second", mood: 3 });
    gate.resolve();
    assert.equal((await a).ok, true);
    assert.equal(h.writes.length, 2);
    assert.deepEqual(h.writes.map((write) => write.revision), [4, 5]);
    assert.equal(h.remote().values.body, "Second");
    assert.equal(h.remote().values.mood, 3);
  });

  it("does not discard an edit back to the original value while an older value is saving", async () => {
    const h = harness();
    const { gate, started } = h.blockNext();
    h.queue.patch({ body: "Temporary" });
    const save = h.queue.flush();
    await started.promise;
    h.queue.patch({ body: "Original" });
    gate.resolve();
    assert.equal((await save).ok, true);
    assert.equal(h.remote().values.body, "Original");
    assert.equal(h.writes.length, 2);
  });

  it("combines rapid edits to different fields without dropping either one", async () => {
    const h = harness();
    h.queue.patch({ body: "Typed" });
    h.queue.patch({ title: "New title" });
    assert.equal((await h.queue.flush()).ok, true);
    assert.deepEqual(h.writes[0].patch, { body: "Typed", title: "New title" });
  });

  it("finishes a pending write after the editor unsubscribes", async () => {
    const h = harness();
    const { gate, started } = h.blockNext();
    const unsubscribe = h.queue.subscribe(() => {});
    h.queue.patch({ body: "After navigation" });
    const save = h.queue.flush();
    await started.promise;
    unsubscribe();
    gate.resolve();
    assert.equal((await save).ok, true);
    assert.equal(h.remote().values.body, "After navigation");
  });

  it("recovers an existing-entry draft and merges independent remote metadata", async () => {
    const h = harness({ pending: { body: "Recovered local prose" } });
    h.setRemote({ ...initial(), revision: 8, values: { ...initial().values, title: "Named elsewhere" } });
    assert.equal((await h.queue.flush()).ok, true);
    assert.deepEqual(h.writes.map((write) => write.revision), [4, 8]);
    assert.equal(h.remote().values.title, "Named elsewhere");
    assert.equal(h.remote().values.body, "Recovered local prose");
  });

  it("preserves both versions of a conflicting body instead of retrying a stale overwrite", async () => {
    const h = harness();
    h.queue.patch({ body: "My desktop text" });
    h.setRemote({ ...initial(), revision: 7, values: { ...initial().values, body: "My phone text" } });
    assert.equal((await h.queue.flush()).ok, false);
    assert.equal(h.queue.getState().status, "conflict");
    assert.deepEqual(h.queue.getState().conflicts, ["body"]);
    assert.equal(h.queue.current().values.body, "My desktop text");
    assert.equal(h.queue.getRemoteConflict()?.values.body, "My phone text");
    assert.equal(h.remote().values.body, "My phone text");
    assert.equal(h.disk()?.pending.body, "My desktop text");
    assert.equal((await h.queue.flush()).ok, false);
    assert.equal(h.writes.length, 1);
  });

  it("allows an explicit merged resolution using the conflicting server revision", async () => {
    const h = harness();
    h.queue.patch({ body: "Local" });
    h.setRemote({ ...initial(), revision: 9, values: { ...initial().values, body: "Remote" } });
    await h.queue.flush();
    assert.equal((await h.queue.resolveConflict({ ...initial().values, body: "Remote\n\nLocal" })).ok, true);
    assert.equal(h.writes[1].revision, 9);
    assert.equal(h.remote().values.body, "Remote\n\nLocal");
  });

  it("does not call a failed local checkpoint saved", async () => {
    const h = harness({ failLocal: true });
    h.queue.patch({ body: "Keep this tab open" });
    assert.equal((await h.queue.flush()).ok, false);
    assert.equal(h.queue.getState().durable, false);
    assert.equal(h.queue.current().values.body, "Keep this tab open");
    assert.equal(h.writes.length, 0);
  });

  it("uses one stable entry identity and single flight for first-save plus Done", async () => {
    const h = harness({ initial: { ...initial(), revision: null } });
    const { gate, started } = h.blockNext();
    const automatic = h.queue.flush();
    await started.promise;
    const done = h.queue.flush();
    assert.equal(automatic, done);
    gate.resolve();
    const result = await done;
    assert.equal(result.ok, true);
    assert.equal(result.entryId, "entry-a");
    assert.equal(h.writes.length, 1);
  });

  it("rejects an acknowledgement for the wrong entry or account", async () => {
    const base = initial();
    let disk: JournalPendingDraft | null = null;
    const queue = new JournalSaveQueue(base, {
      persist: async (draft) => { disk = draft; }, read: async () => base,
      write: async () => ({ ...base, id: "different-entry", revision: 5 }),
    });
    queue.patch({ body: "Mine" });
    assert.equal((await queue.flush()).ok, false);
    assert.equal(queue.current().values.body, "Mine");
    assert.ok(disk);
  });

  it("does not clear a draft for an unacknowledged new entry", async () => {
    const base = { ...initial(), revision: null };
    const queue = new JournalSaveQueue(base, {
      persist: async () => {}, read: async () => base, write: async () => base,
    });
    assert.equal((await queue.flush()).ok, false);
    assert.equal(queue.isDirty(), true);
  });

  it("ignores an older server response", () => {
    const h = harness();
    assert.equal(h.queue.acceptRemote({ ...initial(), revision: 2, values: { body: "Old response" } }), false);
    assert.equal(h.queue.current().values.body, "Original");
  });

  it("keeps a deleted entry's local draft instead of recreating it", async () => {
    const base = initial();
    const queue = new JournalSaveQueue(base, {
      persist: async () => {},
      read: async () => { throw new Error("Deleted entry"); },
      write: async () => { throw new JournalConflictError(); },
    }, { body: "Unsaved edits" });
    assert.equal((await queue.flush()).ok, false);
    assert.equal(queue.current().revision, 4);
    assert.equal(queue.current().values.body, "Unsaved edits");
  });
});
