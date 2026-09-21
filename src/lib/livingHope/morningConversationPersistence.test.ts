import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), lookup: vi.fn(), journal: vi.fn(), enrich: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: fake.from, rpc: fake.rpc } }));
vi.mock("@/lib/journal/journals", () => ({ getDefaultJournalId: fake.journal }));
vi.mock("@/lib/journal/context", () => ({ scheduleEntryContextEnrichment: fake.enrich }));
import { getOrCreateMorningConversationEntry } from "./morningConversationJournal";

beforeEach(() => {
  vi.clearAllMocks();
  fake.from.mockImplementation(() => {
    const query = { select: () => query, eq: () => query, contains: () => query, order: () => query, limit: () => query, maybeSingle: fake.lookup };
    return query;
  });
  fake.lookup.mockResolvedValue({ data: null, error: null });
  fake.journal.mockResolvedValue("default-journal");
  fake.rpc.mockResolvedValue({ data: [{ entry_id: "one-entry", created: true }], error: null });
});

describe("single daily Morning Formula journal", () => {
  it("reuses the existing video entry instead of creating another journal", async () => {
    fake.lookup.mockResolvedValue({ data: { id: "video-entry" }, error: null });
    await expect(getOrCreateMorningConversationEntry("user", "2026-01-01")).resolves.toEqual({ entryId: "video-entry", created: false });
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it("coalesces simultaneous worship and thanksgiving entry requests", async () => {
    const result = await Promise.all([getOrCreateMorningConversationEntry("user", "2026-01-01"), getOrCreateMorningConversationEntry("user", "2026-01-01")]);
    expect(result.map((row) => row.entryId)).toEqual(["one-entry", "one-entry"]);
    expect(fake.lookup).toHaveBeenCalledTimes(1);
    expect(fake.rpc).toHaveBeenCalledTimes(1);
    expect(fake.rpc.mock.calls[0][0]).toBe("ensure_morning_formula_entry");
    expect(fake.enrich).toHaveBeenCalledWith("user", "one-entry");
  });
  it("does not create a duplicate when the lookup fails", async () => {
    fake.lookup.mockResolvedValue({ data: null, error: new Error("offline") });
    await expect(getOrCreateMorningConversationEntry("user", "2026-01-01")).rejects.toThrow("offline");
    expect(fake.rpc).not.toHaveBeenCalled();
  });
  it("clears a failed in-flight request so a retry can succeed", async () => {
    fake.rpc.mockResolvedValueOnce({ data: null, error: new Error("unavailable") });
    await expect(getOrCreateMorningConversationEntry("user", "2026-01-01")).rejects.toThrow("unavailable");
    await expect(getOrCreateMorningConversationEntry("user", "2026-01-01")).resolves.toMatchObject({ entryId: "one-entry" });
  });
  it("keeps different users and dates isolated", async () => {
    await Promise.all([getOrCreateMorningConversationEntry("user-a", "2026-01-01"), getOrCreateMorningConversationEntry("user-b", "2026-01-01"), getOrCreateMorningConversationEntry("user-a", "2026-01-02")]);
    expect(fake.rpc).toHaveBeenCalledTimes(3);
  });
});
