import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
const h = vi.hoisted(() => ({ key: null as object | null, decrypt: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/stores/journalVaultStore", () => ({ getJournalDek: () => h.key }));
vi.mock("./journalEntryCrypto", () => ({ decryptJournalListRow: (row: unknown) => h.decrypt(row) }));
import { fetchJournalEntryListPage, type JournalEntryListRow } from "./entryListQuery";
const row = (id: string, patch: Partial<JournalEntryListRow> = {}): JournalEntryListRow => ({ id, user_id: "owner", title: "Prayer", body: "Preview", summary: null, entry_at_ts: "2026-09-12T00:00:00Z", updated_at: "2026-09-12T00:00:00Z", mood: null, location_name: null, weather: null, weather_temp_c: null, weather_icon: null, pinned: false, analyze_for_mirror: false, journal_id: null, entry_kind: null, e2e_encrypted: false, ...patch });
function mockClient(pages: JournalEntryListRow[][]) {
  const rpc = vi.fn(async () => ({ data: pages.shift() ?? [], error: null }));
  const auth = { getSession: vi.fn(async () => ({ data: { session: { user: { id: "owner" } } }, error: null })) };
  return { client: { rpc, auth } as unknown as SupabaseClient<Database>, rpc, auth };
}
beforeEach(() => { h.key = null; h.decrypt.mockReset().mockImplementation(async (record) => record); });
describe("journal server search and encrypted local search", () => {
  it("passes text search to the server and retains full-body matches outside the preview", async () => {
    const { client, rpc } = mockClient([[row("a")]]);
    const result = await fetchJournalEntryListPage(client, { userId: "owner", search: "deep phrase", excludeJournalIds: ["notes"] });
    expect(rpc).toHaveBeenCalledWith("journal_entry_list_page", expect.objectContaining({ p_search: "deep phrase", p_exclude_journal_ids: ["notes"], p_journal_id: null }));
    expect(result.rows[0].id).toBe("a"); // Server checked text beyond the abbreviated preview.
  });
  it("uses a lookahead row and removes it from the displayed page", async () => {
    const { client } = mockClient([[row("a"), row("b"), row("c")]]);
    const result = await fetchJournalEntryListPage(client, { limit: 2, offset: 2 });
    expect(result.rows.map((r) => r.id)).toEqual(["a", "b"]); expect(result.hasMore).toBe(true);
  });
  it("searches decrypted text locally through short candidate pages", async () => {
    h.key = {};
    h.decrypt.mockImplementation(async (record) => ({ ...record, body: record.id === "b" ? "x".repeat(900) + " ANSWER " : "No match", contentLocked: false }));
    const { client, rpc } = mockClient([[row("a", { e2e_encrypted: true })], [row("b", { e2e_encrypted: true })], []]);
    const result = await fetchJournalEntryListPage(client, { search: "answer" });
    expect(result.rows.map((r) => r.id)).toEqual(["b"]); expect(result.rows[0].body).toHaveLength(512);
    expect(rpc.mock.calls.map((call) => (call as unknown as [string, { p_offset: number }])[1].p_offset)).toEqual([0, 1, 2]);
  });
  it("does not upload decrypted journal bodies in RPC arguments", async () => {
    h.key = {}; const secret = "private decrypted body";
    h.decrypt.mockImplementation(async (record) => ({ ...record, body: secret }));
    const { client, rpc } = mockClient([[row("a", { e2e_encrypted: true, body: "ciphertext" })], []]);
    await fetchJournalEntryListPage(client, { search: "private" });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(secret);
  });
  it("rejects results from a different account", async () => {
    const { client } = mockClient([[row("a", { user_id: "other" })]]);
    await expect(fetchJournalEntryListPage(client, {})).rejects.toThrow("another account");
  });
  it("rejects results when the vault locks during decryption", async () => {
    h.key = {}; h.decrypt.mockImplementation(async (record) => { h.key = null; return record; });
    const { client } = mockClient([[row("a")]]);
    await expect(fetchJournalEntryListPage(client, {})).rejects.toThrow("access changed");
  });
  it("fails closed when the new RPC is unavailable instead of removing encryption columns", async () => {
    const { client, rpc } = mockClient([]);
    rpc.mockResolvedValueOnce({ data: null, error: new Error("RPC unavailable") } as never);
    await expect(fetchJournalEntryListPage(client, {})).rejects.toThrow("RPC unavailable");
  });
});
