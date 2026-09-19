import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { useMindGraphData } from "./useMindGraphData";
import { fetchUnifiedMindGraph } from "@/lib/graph/fetchUnifiedMindGraph";
import type { UnifiedMindGraphInput } from "@/lib/graph/unifiedMindGraph";
vi.mock("@/lib/graph/fetchUnifiedMindGraph", () => ({ fetchUnifiedMindGraph: vi.fn() }));
const data = (id: string) => ({ entries: [{ id }], beliefs: [], artifacts: [], entities: [], journalLinks: [], beliefLinks: [], tensions: [], beliefSources: [], claims: [], scriptures: [], entityMentions: [] }) as UnifiedMindGraphInput;
afterEach(() => { cleanup(); vi.clearAllMocks(); useJournalVaultStore.setState({ dek: null, locking: false, e2eEnabled: false, lockEpoch: 0, e2eRequiredJournalIds: new Set() }); });
describe("mind graph ownership", () => {
  it("ignores late data for a prior account", async () => {
    let first!: (value: UnifiedMindGraphInput) => void;
    vi.mocked(fetchUnifiedMindGraph).mockImplementationOnce(() => new Promise((resolve) => { first = resolve; })).mockResolvedValueOnce(data("new"));
    const { result, rerender } = renderHook(({ id }) => useMindGraphData(id, null), { initialProps: { id: "old" } });
    rerender({ id: "new" });
    await waitFor(() => expect(result.current.raw?.entries[0].id).toBe("new"));
    await act(async () => { first(data("old")); });
    expect(result.current.raw?.entries[0].id).toBe("new");
  });
  it("clears on lock without fetching while blocked", async () => {
    vi.mocked(fetchUnifiedMindGraph).mockResolvedValue(data("private"));
    const { result } = renderHook(() => useMindGraphData("user", null));
    await waitFor(() => expect(result.current.raw).not.toBeNull());
    act(() => useJournalVaultStore.setState({ locking: true }));
    expect(result.current.raw).toBeNull(); expect(result.current.blocked).toBe(true);
    expect(fetchUnifiedMindGraph).toHaveBeenCalledTimes(1);
  });
  it("reports failures and supports retry", async () => {
    vi.mocked(fetchUnifiedMindGraph).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(data("ok"));
    const { result } = renderHook(() => useMindGraphData("user", null));
    await waitFor(() => expect(result.current.error).toBe(true));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.raw?.entries[0].id).toBe("ok"));
  });
  it("clears on sign-out", async () => {
    vi.mocked(fetchUnifiedMindGraph).mockResolvedValue(data("private"));
    const { result, rerender } = renderHook(({ id }: { id: string | undefined }) => useMindGraphData(id, null), { initialProps: { id: "user" as string | undefined } });
    await waitFor(() => expect(result.current.raw).not.toBeNull());
    rerender({ id: undefined }); expect(result.current.raw).toBeNull();
  });
});
