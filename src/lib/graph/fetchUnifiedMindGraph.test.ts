import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ failed: false, encrypted: false, from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: state.from } }));
vi.mock("@/lib/journal/journalEntryCrypto", () => ({ decryptJournalRows: async (rows: unknown[]) => rows.map((row) => ({ ...(row as object), contentLocked: state.encrypted })) }));
import { fetchUnifiedMindGraph } from "./fetchUnifiedMindGraph";
function configure() {
  state.from.mockImplementation((table: string) => {
    const response = { data: table === "journal_entries" ? [{ id: "one", title: "Note", body: "Words" }] : [], error: state.failed && table === "belief_links" ? { message: "offline" } : null };
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "or", "order", "limit", "not"]) chain[method] = vi.fn(() => chain);
    chain.then = (resolve: (value: typeof response) => unknown) => Promise.resolve(response).then(resolve);
    return chain;
  });
}
afterEach(() => { state.failed = false; state.encrypted = false; vi.clearAllMocks(); });
describe("mind graph loading", () => {
  it("reads only the current account and reports partial query failures", async () => {
    configure(); state.failed = true;
    await expect(fetchUnifiedMindGraph("user")).rejects.toThrow("complete mind map");
  });
  it("omits encrypted entries that remain locked after decoding", async () => {
    configure(); state.encrypted = true;
    expect((await fetchUnifiedMindGraph("user")).entries).toEqual([]);
  });
  it("keeps readable previews", async () => {
    configure(); expect((await fetchUnifiedMindGraph("user")).entries[0]).toMatchObject({ id: "one", body: "Words" });
  });
});
