import { describe, expect, it, vi, afterEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { assessJournalVideoStorage, probeJournalVideoStorage, inspectJournalVideoStorage, JOURNAL_VIDEO_STORAGE_RESERVE_BYTES } from "./journalVideoStorage";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("video storage preflight", () => {
  it("accounts for existing usage without subtracting pending recordings twice", () => {
    const available = JOURNAL_VIDEO_STORAGE_RESERVE_BYTES + 1024;
    expect(assessJournalVideoStorage({ quota: available + 500000000, usage: 500000000 }, false, true, 8))
      .toMatchObject({ status: "ok", availableBytes: available, persistent: false, pendingCount: 8 });
    expect(assessJournalVideoStorage({ quota: 100, usage: 99 }, true, true).status).toBe("low");
  });
  it("does not confuse persistence permission with sufficient space or a successful write", () => {
    expect(assessJournalVideoStorage({ quota: 1e9, usage: 0 }, true, false).status).toBe("unavailable");
    expect(assessJournalVideoStorage(null, true, null).status).toBe("unknown");
  });
  it("commits a synthetic IndexedDB probe and handles blocked storage", async () => {
    await expect(probeJournalVideoStorage(new IDBFactory())).resolves.toBe(true);
    await expect(probeJournalVideoStorage({ open: () => { throw new Error("storage disabled"); } } as unknown as IDBFactory)).resolves.toBe(false);
  });
  it("treats hanging estimates as unknown, not unlimited storage", async () => {
    vi.useFakeTimers(); vi.stubGlobal("navigator", { storage: { estimate: () => new Promise(() => {}), persisted: async () => false } });
    vi.stubGlobal("indexedDB", undefined);
    const pending = inspectJournalVideoStorage(2);
    await vi.advanceTimersByTimeAsync(2100);
    expect(await pending).toMatchObject({ status: "unknown", persistent: false, pendingCount: 2 });
  });
});
