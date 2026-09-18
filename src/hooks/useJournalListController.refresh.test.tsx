import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalEntryListRow, JournalListOptions } from "@/lib/journal/entryListQuery";
import { useJournalListController } from "./useJournalListController";

const harness = vi.hoisted(() => ({ fetchPage: vi.fn(), media: vi.fn(), dek: null as CryptoKey | null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/journal/entryListQuery", () => ({ fetchJournalEntryListPage: harness.fetchPage }));
vi.mock("@/lib/journal/entryListMedia", () => ({ fetchEntryListMediaUrls: harness.media }));
vi.mock("@/stores/journalVaultStore", () => ({
  useJournalVaultStore: (select: (state: { dek: CryptoKey | null }) => unknown) => select({ dek: harness.dek }),
}));
vi.mock("@/lib/journal/journalE2eSchema", () => ({ formatJournalLoadError: (error: Error) => error.message }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const row = (id: string, body = "Original") => ({ id, body, title: id, user_id: "user-a", contentLocked: false }) as JournalEntryListRow;
const base: JournalListOptions & { reloadKey?: number } = { userId: "user-a", journalId: "journal-a", reloadKey: 0 };
const runScheduledLoad = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(300); }); };

beforeEach(() => {
  vi.useFakeTimers();
  harness.dek = null;
  harness.fetchPage.mockReset().mockResolvedValue({ rows: [row("entry-a")], hasMore: false });
  harness.media.mockReset().mockResolvedValue({ photoUrls: { "entry-a": "photo-a" }, videoUrls: { "entry-a": "video-a" } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("journal list background refresh", () => {
  it("keeps rows and media visible throughout an autosave refresh", async () => {
    const { result, rerender } = renderHook((options) => useJournalListController(options), { initialProps: base });
    await runScheduledLoad();
    const rows = result.current.entries;
    const photos = result.current.photoUrls;
    const videos = result.current.videoUrls;
    const response = deferred<{ rows: JournalEntryListRow[]; hasMore: boolean }>();
    harness.fetchPage.mockReturnValueOnce(response.promise);
    rerender({ ...base, reloadKey: 1 });
    expect(result.current.entries).toBe(rows);
    expect(result.current.loading).toBe(false);
    await runScheduledLoad();
    expect(result.current.entries).toBe(rows);
    expect(result.current.photoUrls).toBe(photos);
    expect(result.current.videoUrls).toBe(videos);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.loading).toBe(false);
    await act(async () => { response.resolve({ rows: [row("entry-a", "Latest saved words")], hasMore: false }); });
    expect(result.current.entries[0].body).toBe("Latest saved words");
    expect(result.current.refreshing).toBe(false);
  });

  it("ignores an older refresh even when it resolves after a newer save", async () => {
    const { result, rerender } = renderHook((options) => useJournalListController(options), { initialProps: base });
    await runScheduledLoad();
    const old = deferred<{ rows: JournalEntryListRow[]; hasMore: boolean }>();
    const fresh = deferred<{ rows: JournalEntryListRow[]; hasMore: boolean }>();
    harness.fetchPage.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    rerender({ ...base, reloadKey: 1 });
    await runScheduledLoad();
    const oldSignal = harness.fetchPage.mock.calls[1][1].signal as AbortSignal;
    rerender({ ...base, reloadKey: 2 });
    await runScheduledLoad();
    expect(oldSignal.aborted).toBe(true);
    await act(async () => { fresh.resolve({ rows: [row("entry-a", "New")], hasMore: false }); });
    await act(async () => { old.resolve({ rows: [row("entry-a", "Stale")], hasMore: false }); });
    expect(result.current.entries[0].body).toBe("New");
  });

  it.each([
    { userId: "user-b" }, { journalId: "journal-b" }, { search: "different query" },
    { entryKindFilter: "vent" as const }, { excludeJournalIds: ["excluded"] },
  ])("clears the old collection immediately when access or filters change: %j", async (change) => {
    const { result, rerender } = renderHook((options) => useJournalListController(options), { initialProps: base });
    await runScheduledLoad();
    rerender({ ...base, ...change });
    expect(result.current.entries).toEqual([]);
    expect(result.current.photoUrls).toEqual({});
    expect(result.current.videoUrls).toEqual({});
  });

  it("clears decrypted rows immediately when the vault key changes", async () => {
    harness.dek = {} as CryptoKey;
    const { result, rerender } = renderHook((options) => useJournalListController(options), { initialProps: base });
    await runScheduledLoad();
    harness.dek = null;
    rerender({ ...base });
    expect(result.current.entries).toEqual([]);
    expect(result.current.photoUrls).toEqual({});
  });

  it("refreshes all already-loaded pages without collapsing the visible window", async () => {
    const options = { ...base, limit: 1 };
    harness.fetchPage.mockResolvedValueOnce({ rows: [row("entry-a")], hasMore: true });
    const { result, rerender } = renderHook((value) => useJournalListController(value), { initialProps: options });
    await runScheduledLoad();
    harness.fetchPage.mockResolvedValueOnce({ rows: [row("entry-b")], hasMore: false });
    await act(async () => { await result.current.load(true); });
    expect(result.current.entries.map((entry) => entry.id)).toEqual(["entry-a", "entry-b"]);
    harness.fetchPage.mockResolvedValueOnce({ rows: [row("entry-a", "Edited")], hasMore: true })
      .mockResolvedValueOnce({ rows: [row("entry-b")], hasMore: false });
    rerender({ ...options, reloadKey: 1 });
    await runScheduledLoad();
    expect(result.current.entries.map((entry) => entry.id)).toEqual(["entry-a", "entry-b"]);
    expect(result.current.entries[0].body).toBe("Edited");
    expect(harness.fetchPage.mock.calls.at(-1)?.[1].offset).toBe(1);
  });

  it("retains the list on refresh failure but still reports initial load failures", async () => {
    const { result, rerender } = renderHook((options) => useJournalListController(options), { initialProps: base });
    await runScheduledLoad();
    harness.fetchPage.mockRejectedValueOnce(new Error("Offline"));
    rerender({ ...base, reloadKey: 1 });
    await runScheduledLoad();
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.loadError).toBeNull();
    expect(result.current.refreshError).toBe("Offline");
    harness.fetchPage.mockRejectedValueOnce(new Error("Sign in required"));
    rerender({ ...base, userId: "user-b" });
    await runScheduledLoad();
    expect(result.current.entries).toEqual([]);
    expect(result.current.loadError).toBe("Sign in required");
  });
});
