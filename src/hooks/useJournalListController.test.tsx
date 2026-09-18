import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import type { JournalEntryListRow } from "@/lib/journal/entryListQuery";
const h = vi.hoisted(() => ({ read: vi.fn(), media: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/journal/entryListQuery", () => ({ fetchJournalEntryListPage: (...args: unknown[]) => h.read(...args) }));
vi.mock("@/lib/journal/entryListMedia", () => ({ fetchEntryListMediaUrls: (...args: unknown[]) => h.media(...args) }));
import { useJournalListController } from "./useJournalListController";
const row = (id: string, contentLocked = false) => ({ id, title: id, body: id, user_id: "owner", contentLocked }) as JournalEntryListRow;
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => { h.read.mockReset(); h.media.mockReset().mockResolvedValue({ photoUrls: {}, videoUrls: {} }); useJournalVaultStore.setState({ dek: null }); });
afterEach(cleanup);
describe("journal list loading isolation", () => {
  it("discards a delayed earlier search response", async () => {
    const old = deferred<{ rows: JournalEntryListRow[]; hasMore: boolean }>();
    h.read.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ rows: [row("new result")], hasMore: false });
    const { result, rerender } = renderHook(({ search }) => useJournalListController({ userId: "owner", search }), { initialProps: { search: "" } });
    await waitFor(() => expect(h.read).toHaveBeenCalledTimes(1));
    rerender({ search: "new" });
    await waitFor(() => expect(result.current.entries[0]?.id).toBe("new result"));
    await act(async () => old.resolve({ rows: [row("old result")], hasMore: false }));
    expect(result.current.entries[0].id).toBe("new result");
  });
  it("immediately hides the old account's entries on account switch", async () => {
    h.read.mockResolvedValueOnce({ rows: [row("private entry")], hasMore: false }).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ userId }) => useJournalListController({ userId }), { initialProps: { userId: "owner" } });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    rerender({ userId: "other" }); expect(result.current.entries).toEqual([]);
  });
  it("does not request thumbnails for locked entries", async () => {
    h.read.mockResolvedValueOnce({ rows: [row("locked", true), row("open")], hasMore: false });
    const { result } = renderHook(() => useJournalListController({ userId: "owner" }));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(h.media).toHaveBeenCalledWith(["open"], expect.objectContaining({ urls: expect.any(Map), pending: expect.any(Map) }));
  });
  it("reloads when the Notes notebook exclusion becomes available", async () => {
    h.read.mockResolvedValue({ rows: [row("entry")], hasMore: false });
    const { rerender } = renderHook(({ excludes }) => useJournalListController({ userId: "owner", excludeJournalIds: excludes }), { initialProps: { excludes: [] as string[] } });
    await waitFor(() => expect(h.read).toHaveBeenCalledTimes(1));
    rerender({ excludes: ["notes-id"] });
    await waitFor(() => expect(h.read).toHaveBeenCalledTimes(2));
    expect(h.read.mock.calls[1][1].excludeJournalIds).toEqual(["notes-id"]);
  });
  it("preserves loaded entries when the next page fails and exposes retry state", async () => {
    h.read.mockResolvedValueOnce({ rows: [row("entry")], hasMore: true }).mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useJournalListController({ userId: "owner" }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    await act(async () => result.current.load(true));
    expect(result.current.entries[0].id).toBe("entry"); expect(result.current.loadError).toContain("offline"); expect(result.current.hasMore).toBe(true);
  });
});
