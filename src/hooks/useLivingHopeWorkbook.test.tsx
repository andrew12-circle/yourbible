import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLivingHopeWorkbook } from "./useLivingHopeWorkbook";
import { emptyWorkbook, mergeWorkbook, type LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import { getOrCreateWorkbook, saveWorkbookPatch } from "@/lib/livingHope/workbookApi";
vi.mock("@/lib/livingHope/workbookApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livingHope/workbookApi")>();
  return { getOrCreateWorkbook: vi.fn(), saveWorkbookPatch: vi.fn(), mergeWorkbookStories: actual.mergeWorkbookStories };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/livingHope/livingHopeLocalStore", () => ({ isLocalModeNotified: () => false }));
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
beforeEach(() => { vi.mocked(getOrCreateWorkbook).mockReset().mockResolvedValue(emptyWorkbook()); vi.mocked(saveWorkbookPatch).mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("workbook save queue", () => {
  it("saves only changed fields and exposes an awaited save", async () => {
    vi.mocked(saveWorkbookPatch).mockImplementation(async (_owner, patch, base) => ({ ...base!, ...patch }));
    const { result } = renderHook(() => useLivingHopeWorkbook("owner"));
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(async () => { await result.current.save({ morning_memories: [] }); });
    expect(saveWorkbookPatch).toHaveBeenCalledWith("owner", { morning_memories: [] }, expect.any(Object));
    expect(result.current.saving).toBe(false);
  });
  it("serializes saves, drains newer changes, and does not replace them with a stale response", async () => {
    const first = deferred<LivingHopeWorkbookContent>();
    vi.mocked(saveWorkbookPatch).mockImplementationOnce(() => first.promise).mockImplementation(async (_owner, patch, base) => ({ ...base!, ...patch }));
    const { result } = renderHook(() => useLivingHopeWorkbook("owner"));
    await waitFor(() => expect(result.current.busy).toBe(false));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save({ vision_headline: "First" }); });
    act(() => { result.current.update({ vision_headline: "Second" }); });
    expect(saveWorkbookPatch).toHaveBeenCalledTimes(1);
    await act(async () => { first.resolve({ ...emptyWorkbook(), vision_headline: "First" }); await saving; });
    expect(saveWorkbookPatch).toHaveBeenCalledTimes(2);
    expect(result.current.workbook?.vision_headline).toBe("Second");
  });
  it("keeps restored scene metadata visible and saved when more text is typed during the first save", async () => {
    const initial = mergeWorkbook({ stories: [{ id: "scene", text: "Initial text" }] });
    const restored = { ...initial, stories: [{
      ...initial.stories[0], text: "First edit", title: "Restored title",
      cover_image_url: "/restored.webp", narration_storage_path: "owner/recording.mp3",
    }] };
    const first = deferred<LivingHopeWorkbookContent>();
    const second = deferred<LivingHopeWorkbookContent>();
    vi.mocked(getOrCreateWorkbook).mockResolvedValue(initial);
    vi.mocked(saveWorkbookPatch).mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const { result } = renderHook(() => useLivingHopeWorkbook("owner"));
    await waitFor(() => expect(result.current.busy).toBe(false));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save({ stories: [{ ...initial.stories[0], text: "First edit" }] }); });
    act(() => { result.current.update({ stories: [{ ...initial.stories[0], text: "Second edit" }] }); });

    await act(async () => { first.resolve(restored); });
    await waitFor(() => expect(saveWorkbookPatch).toHaveBeenCalledTimes(2));
    const expectedStories = [{ ...restored.stories[0], text: "Second edit" }];
    expect(result.current.workbook?.stories).toEqual(expectedStories);
    expect(vi.mocked(saveWorkbookPatch).mock.calls[1]).toEqual(["owner", { stories: expectedStories }, restored]);

    await act(async () => { second.resolve({ ...restored, stories: expectedStories }); await saving; });
    expect(result.current.workbook?.stories).toEqual(expectedStories);
  });
  it("preserves an intentional media removal queued during a save while adopting other server changes", async () => {
    const initial = mergeWorkbook({ stories: [{
      id: "scene", text: "Initial text", title: "Original title", cover_storage_path: "owner/old.png",
    }] });
    const first = deferred<LivingHopeWorkbookContent>();
    vi.mocked(getOrCreateWorkbook).mockResolvedValue(initial);
    vi.mocked(saveWorkbookPatch).mockImplementationOnce(() => first.promise)
      .mockImplementation(async (_owner, patch, base) => ({ ...base!, ...patch }));
    const { result } = renderHook(() => useLivingHopeWorkbook("owner"));
    await waitFor(() => expect(result.current.busy).toBe(false));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save({ stories: [{ ...initial.stories[0], text: "First edit" }] }); });
    act(() => { result.current.update({ stories: [{ ...initial.stories[0], text: "Second edit", cover_storage_path: undefined }] }); });

    const saved = { ...initial, stories: [{ ...initial.stories[0], text: "First edit", title: "Server title" }] };
    await act(async () => { first.resolve(saved); await saving; });

    expect(result.current.workbook?.stories).toEqual([
      { ...saved.stories[0], text: "Second edit", cover_storage_path: undefined },
    ]);
    expect(saveWorkbookPatch).toHaveBeenCalledTimes(2);
  });
  it("retains failed changes for an explicit retry instead of reporting a false save", async () => {
    vi.mocked(saveWorkbookPatch).mockRejectedValueOnce(new Error("Offline")).mockImplementation(async (_owner, patch, base) => ({ ...base!, ...patch }));
    const { result } = renderHook(() => useLivingHopeWorkbook("owner"));
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(async () => { result.current.update({ vision_headline: "Keep my edit" }); await expect(result.current.flush()).rejects.toThrow("Offline"); });
    expect(result.current.workbook?.vision_headline).toBe("Keep my edit");
    expect(result.current.saveError).toBe("Offline");
    await act(async () => { await result.current.flush(); });
    expect(result.current.saveError).toBe("");
    expect(saveWorkbookPatch).toHaveBeenCalledTimes(2);
  });
  it("does not silently resubmit a failed explicit editor save after cancellation", async () => {
    vi.mocked(saveWorkbookPatch).mockRejectedValueOnce(new Error("Offline"));
    const { result } = renderHook(() => useLivingHopeWorkbook("owner"));
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(async () => { await expect(result.current.save({ morning_memories: [] })).rejects.toThrow("Offline"); });
    await act(async () => { await result.current.flush(); });
    expect(saveWorkbookPatch).toHaveBeenCalledTimes(1);
  });
  it("does not adopt a former owner's delayed save after an account change", async () => {
    const first = deferred<LivingHopeWorkbookContent>();
    vi.mocked(saveWorkbookPatch).mockImplementationOnce(() => first.promise);
    const { result, rerender } = renderHook(({ owner }) => useLivingHopeWorkbook(owner), { initialProps: { owner: "owner-a" } });
    await waitFor(() => expect(result.current.busy).toBe(false));
    let saving!: Promise<void>;
    act(() => { saving = result.current.save({ vision_headline: "Private A" }); });
    rerender({ owner: "owner-b" });
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(async () => { first.resolve({ ...emptyWorkbook(), vision_headline: "Private A" }); await expect(saving).rejects.toThrow("account changed"); });
    expect(result.current.workbook?.vision_headline).toBe("");
    expect(saveWorkbookPatch).toHaveBeenCalledWith("owner-a", expect.any(Object), expect.any(Object));
  });
});
