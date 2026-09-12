// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJournalComposePersistence, type ComposePersistenceSnapshot } from "./useJournalComposePersistence";
import { createLocalJournalDocument, peekJournalDocument } from "@/lib/journal/journalDocuments";
import type { JournalSnapshot } from "@/lib/journal/journalSaveQueue";

const harness = vi.hoisted(() => ({
  queues: new Map(),
  write: vi.fn(),
  persist: vi.fn(),
  created: vi.fn(),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/journal/journalDocuments", async () => {
  const { JournalSaveQueue } = await vi.importActual<typeof import("@/lib/journal/journalSaveQueue")>("@/lib/journal/journalSaveQueue");
  const key = (user: string, id: string) => `${user}:${id}`;
  const open = async (user: string, id: string) => {
    const queue = harness.queues.get(key(user, id));
    if (!queue) throw new Error("Missing test entry");
    return queue;
  };
  return {
    JOURNAL_DOCUMENT_CHANGED: "journal-test-change",
    registerJournalEditorSync: () => () => {},
    peekJournalDocument: (user: string, id: string) => harness.queues.get(key(user, id)),
    openJournalDocument: open,
    flushJournalDocument: async (user: string, id: string) => (await open(user, id)).flush(),
    createLocalJournalDocument: (user: string, id: string, values: Record<string, unknown>) => {
      const existing = harness.queues.get(key(user, id));
      if (existing) return existing;
      harness.created(id);
      const queue = new JournalSaveQueue({ id, userId: user, revision: null, encrypted: false, values }, {
        write: (base, patch) => harness.write(base, patch),
        read: async () => queue.current(),
        persist: (draft) => harness.persist(draft),
      });
      harness.queues.set(key(user, id), queue);
      queue.subscribe(() => window.dispatchEvent(new CustomEvent("journal-test-change", { detail: { userId: user, entryId: id } })));
      return queue;
    },
    patchJournalDocument: (user: string, id: string, patch: Record<string, unknown>) => {
      const queue = harness.queues.get(key(user, id));
      queue.patch(patch);
      return queue.current().values;
    },
  };
});
const snapshot = (body = "My writing"): ComposePersistenceSnapshot => ({
  title: "Prayer", body, summary: "", tags: [], mood: null, entryKind: null,
  journalId: null, verseRef: "", beliefId: "", promptId: null, locationName: "",
  lat: null, lng: null, weather: null, weatherTempC: null, weatherIcon: null,
  analyzeForMirror: false, entryAt: "2026-09-12T15:00:00.000Z",
});
const settle = async () => { for (let n = 0; n < 30; n += 1) await Promise.resolve(); };
beforeEach(() => {
  harness.queues.clear();
  harness.created.mockReset();
  harness.persist.mockReset().mockResolvedValue(undefined);
  harness.write.mockReset().mockImplementation(async (base: JournalSnapshot, patch: Record<string, unknown>) => ({
    ...base, revision: (base.revision ?? 0) + 1, values: { ...base.values, ...patch },
  }));
  sessionStorage.clear();
});
afterEach(async () => { cleanup(); await settle(); });

describe("journal compose persistence integration", () => {
  it("reuses one entry identity when Done races initial autosave", async () => {
    const getSnapshot = () => snapshot();
    const setInlineEntryId = vi.fn();
    const { result } = renderHook(() => useJournalComposePersistence({ userId: "u1", editId: undefined, inlineEntryId: null, setInlineEntryId, entryKind: null, isListening: false, getSnapshot }));
    let saved;
    await act(async () => {
      result.current.schedulePersist();
      saved = await result.current.flushServerSave();
    });
    expect(saved.ok).toBe(true);
    expect(harness.created).toHaveBeenCalledTimes(1);
    expect(setInlineEntryId).toHaveBeenCalledTimes(1);
    expect(saved.snapshot.values.body).toBe("My writing");
    expect(harness.write).toHaveBeenCalledTimes(1);
  });
  it("returns a failed silent flush and retains the recoverable pending entry", async () => {
    harness.write.mockRejectedValue(new Error("network disconnected"));
    const { result } = renderHook(() => useJournalComposePersistence({ userId: "u1", editId: undefined, inlineEntryId: null, setInlineEntryId: vi.fn(), entryKind: null, isListening: false, getSnapshot: () => snapshot() }));
    let saved;
    await act(async () => { saved = await result.current.flushServerSave({ silent: true }); });
    expect(saved.ok).toBe(false);
    const queue = peekJournalDocument("u1", saved.entryId)!;
    expect(queue.isDirty()).toBe(true);
    expect(queue.current().values.body).toBe("My writing");
    expect(harness.persist).toHaveBeenCalledWith(expect.objectContaining({ base: expect.objectContaining({ id: saved.entryId }) }));
  });
  it("does not undo a remote transcript if Done fires before React displays it", async () => {
    const queue = createLocalJournalDocument("u1", "e1", { body: "My writing", title: "Prayer", summary: null, tags: [] });
    queue.acceptRemote({ ...queue.current(), revision: 1 });
    const onDocumentChange = vi.fn();
    const { result } = renderHook(() => useJournalComposePersistence({ userId: "u1", editId: "e1", inlineEntryId: null, setInlineEntryId: vi.fn(), entryKind: null, isListening: false, getSnapshot: () => snapshot(), onDocumentChange }));
    await act(async () => {
      result.current.initialize({ ...queue.current().values, id: "e1", user_id: "u1", revision: 1, e2e_encrypted: false } as never);
      result.current.schedulePersist();
      await settle();
    });
    harness.write.mockClear();
    await act(async () => {
      queue.acceptRemote({ ...queue.current(), revision: 2, values: { ...queue.current().values, body: "My writing\n\nCompleted transcript" } });
      await result.current.flushServerSave();
    });
    expect(onDocumentChange).toHaveBeenCalledWith(expect.objectContaining({ body: "My writing\n\nCompleted transcript" }));
    expect(queue.current().values.body).toBe("My writing\n\nCompleted transcript");
    expect(harness.write).not.toHaveBeenCalled();
  });
  it("keeps a failed pending write after the editor unmounts", async () => {
    harness.write.mockRejectedValue(new Error("offline"));
    const { result, unmount } = renderHook(() => useJournalComposePersistence({ userId: "u1", editId: undefined, inlineEntryId: null, setInlineEntryId: vi.fn(), entryKind: null, isListening: false, getSnapshot: () => snapshot("Keep these words") }));
    await act(async () => { result.current.schedulePersist(); await settle(); });
    await act(async () => { unmount(); await settle(); });
    const queue = [...harness.queues.values()][0];
    expect(queue.isDirty()).toBe(true);
    expect(queue.current().values.body).toBe("Keep these words");
    expect(harness.persist).toHaveBeenCalled();
  });
});
