import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLivingHopeWorkbook } from "./useLivingHopeWorkbook";
import { emptyWorkbook, type LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import { getOrCreateWorkbook, saveWorkbookPatch } from "@/lib/livingHope/workbookApi";
vi.mock("@/lib/livingHope/workbookApi", () => ({ getOrCreateWorkbook: vi.fn(), saveWorkbookPatch: vi.fn() }));
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
