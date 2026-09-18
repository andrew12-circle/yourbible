import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalEntryListRow } from "@/lib/journal/entryListQuery";
import type { JournalSnapshot } from "@/lib/journal/journalSaveQueue";
import { notifyJournalListEntrySaved } from "@/lib/journal/journalListUpdates";
import { useJournalListController } from "./useJournalListController";
import EntryListMediaThumbnail from "@/components/journal/EntryListMediaThumbnail";

const h = vi.hoisted(() => ({ read: vi.fn(), signVideo: vi.fn(), signPhoto: vi.fn(), path: "owner/entry/clip.webm", metadataError: false, dek: null as CryptoKey | null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => ({ select: () => ({ in: () => ({ order: async () => ({
    data: table === "journal_videos" && h.path ? [{ entry_id: "entry", storage_path: h.path }] : [],
    error: h.metadataError ? new Error("Media temporarily unavailable") : null,
  }) }) }) }),
} }));
vi.mock("@/lib/journal/entryListQuery", () => ({ fetchJournalEntryListPage: (...args: unknown[]) => h.read(...args) }));
vi.mock("@/lib/journal/videos", () => ({ getSignedVideoUrls: (paths: string[]) => h.signVideo(paths) }));
vi.mock("@/lib/journal/photos", () => ({ getSignedPhotoUrls: (paths: string[]) => h.signPhoto(paths) }));
vi.mock("@/stores/journalVaultStore", () => ({ useJournalVaultStore: (select: (state: { dek: CryptoKey | null }) => unknown) => select({ dek: h.dek }) }));
const row = (body = "Original") => ({ id: "entry", user_id: "owner", title: "Title", body, summary: null,
  entry_at_ts: "2026-09-18T14:00:00Z", journal_id: "journal", entry_kind: null, pinned: false,
  e2e_encrypted: false, contentLocked: false }) as JournalEntryListRow;
const snapshot = (body = "Edited", patch: Record<string, unknown> = {}): JournalSnapshot => ({
  id: "entry", userId: "owner", revision: 2, encrypted: false, values: {
    body, title: "Title", journal_id: "journal", entry_kind: null, pinned: false, ...patch,
  },
});
let list: ReturnType<typeof useJournalListController>;
function Surface({ userId = "owner", search = "" }: { userId?: string; search?: string }) {
  list = useJournalListController({ userId, journalId: "journal", search });
  return <>{list.entries.map((entry) => <div key={entry.id} data-testid="row">
    <span>{entry.body}</span><EntryListMediaThumbnail videoUrl={list.videoUrls[entry.id]} photoUrl={list.photoUrls[entry.id]} />
  </div>)}</>;
}
beforeEach(() => {
  h.path = "owner/entry/clip.webm"; h.metadataError = false; h.dek = null;
  h.read.mockReset().mockResolvedValue({ rows: [row()], hasMore: false });
  h.signPhoto.mockReset().mockResolvedValue({});
  h.signVideo.mockReset().mockImplementation(async (paths: string[]) => Object.fromEntries(paths.map((path) => [path, `${path}?signature=${h.signVideo.mock.calls.length}`])));
});
afterEach(cleanup);

async function open() {
  const rendered = render(<Surface />);
  await waitFor(() => expect(screen.getByTestId("row").querySelector("video")).not.toBeNull());
  return rendered;
}
describe("acknowledged journal edits do not reload thumbnails", () => {
  it("keeps the same video node and src through repeated text/title saves without list or signing requests", async () => {
    await open();
    const node = screen.getByTestId("row");
    const video = node.querySelector("video")!;
    const url = video.getAttribute("src");
    for (let i = 0; i < 12; i++) {
      act(() => notifyJournalListEntrySaved(snapshot(`Words ${i}`, { title: `Title ${i}` })));
      expect(screen.getByTestId("row")).toBe(node);
      expect(node.querySelector("video")).toBe(video);
      expect(video.getAttribute("src")).toBe(url);
    }
    expect(list.entries[0].body).toBe("Words 11");
    expect(h.read).toHaveBeenCalledTimes(1);
    expect(h.signVideo).toHaveBeenCalledTimes(1);
  });
  it("keeps the video URL on real refreshes, but adopts changed or removed media", async () => {
    await open();
    const video = screen.getByTestId("row").querySelector("video")!;
    const url = video.getAttribute("src");
    await act(async () => { await list.load(); });
    expect(video.getAttribute("src")).toBe(url);
    expect(h.signVideo).toHaveBeenCalledTimes(1);
    h.path = "owner/entry/replacement.webm";
    await act(async () => { await list.load(); });
    expect(screen.getByTestId("row").querySelector("video")).toBe(video);
    expect(video.getAttribute("src")).toContain("replacement.webm");
    expect(h.signVideo).toHaveBeenCalledTimes(2);
    h.path = "";
    await act(async () => { await list.load(); });
    expect(screen.getByTestId("row").querySelector("video")).toBeNull();
  });
  it("does not blank existing thumbnails on transient metadata errors", async () => {
    await open();
    const video = screen.getByTestId("row").querySelector("video");
    h.metadataError = true;
    await act(async () => { await list.load(); });
    expect(screen.getByTestId("row").querySelector("video")).toBe(video);
    expect(list.refreshError).toContain("Media temporarily unavailable");
  });
  it("rejects other-account snapshots and does not reuse URL caches across account/vault changes", async () => {
    const { rerender } = await open();
    act(() => notifyJournalListEntrySaved({ ...snapshot("Private text"), userId: "someone-else" }));
    expect(list.entries[0].body).toBe("Original");
    rerender(<Surface userId="other" />);
    expect(list.entries).toEqual([]);
    await waitFor(() => expect(h.signVideo).toHaveBeenCalledTimes(2));
    h.dek = {} as CryptoKey;
    rerender(<Surface userId="other" />);
    expect(list.entries).toEqual([]);
    await waitFor(() => expect(h.signVideo).toHaveBeenCalledTimes(3));
  });
  it("does not let an older in-flight refresh overwrite acknowledged text", async () => {
    await open();
    let resolve!: (value: { rows: JournalEntryListRow[]; hasMore: boolean }) => void;
    h.read.mockReturnValueOnce(new Promise((yes) => { resolve = yes; })).mockResolvedValueOnce({ rows: [row("Newest")], hasMore: false });
    let old!: Promise<void>;
    act(() => { old = list.load(); });
    act(() => notifyJournalListEntrySaved(snapshot("Newest")));
    await waitFor(() => expect(list.entries[0].body).toBe("Newest"));
    await act(async () => { resolve({ rows: [row("Stale")], hasMore: false }); await old; });
    expect(list.entries[0].body).toBe("Newest");
    expect(h.signVideo).toHaveBeenCalledTimes(1);
  });
});
