import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchEntryVideosMock = vi.fn();
const deleteEntryVideoMock = vi.fn();

vi.mock("@/lib/journal/videos", () => ({
  fetchEntryVideos: (...args: unknown[]) => fetchEntryVideosMock(...args),
  deleteEntryVideo: (...args: unknown[]) => deleteEntryVideoMock(...args),
}));

import { useJournalEntryVideos } from "@/hooks/useJournalEntryVideos";

const video = (id: string) => ({ id, storage_path: `${id}.mp4` });

describe("useJournalEntryVideos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores a late response from the previous journal entry", async () => {
    let resolveFirst!: (rows: ReturnType<typeof video>[]) => void;
    fetchEntryVideosMock
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([video("entry-b-video")]);

    const { result, rerender } = renderHook(
      ({ entryId }) => useJournalEntryVideos(entryId),
      { initialProps: { entryId: "entry-a" as string | null } },
    );
    rerender({ entryId: "entry-b" });

    await waitFor(() => expect(result.current.videos).toEqual([video("entry-b-video")]));
    await act(async () => resolveFirst([video("entry-a-video")]));
    expect(result.current.videos).toEqual([video("entry-b-video")]);
  });

  it("does not let an old delete completion mutate the next entry", async () => {
    let resolveDelete!: () => void;
    fetchEntryVideosMock
      .mockResolvedValueOnce([video("entry-a-video")])
      .mockResolvedValueOnce([video("entry-b-video")]);
    deleteEntryVideoMock.mockReturnValueOnce(new Promise<void>((resolve) => { resolveDelete = resolve; }));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result, rerender } = renderHook(
      ({ entryId }) => useJournalEntryVideos(entryId),
      { initialProps: { entryId: "entry-a" as string | null } },
    );
    await waitFor(() => expect(result.current.videos).toEqual([video("entry-a-video")]));
    let removal!: Promise<void>;
    act(() => { removal = result.current.remove("entry-a-video", "entry-a-video.mp4"); });
    rerender({ entryId: "entry-b" });
    await waitFor(() => expect(result.current.videos).toEqual([video("entry-b-video")]));
    await act(async () => { resolveDelete(); await removal; });
    expect(result.current.videos).toEqual([video("entry-b-video")]);
  });
});
