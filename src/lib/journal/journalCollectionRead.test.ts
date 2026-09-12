import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { collectJournalPages } from "./journalCollectionRead";
describe("complete journal collection reads", () => {
  it("continues through short server-capped pages instead of truncating the archive", async () => {
    const records = Array.from({ length: 1205 }, (_, n) => ({ id: String(n).padStart(6, "0") }));
    const read = vi.fn(async (cursor: string | null) => records.filter((r) => cursor === null || r.id > cursor).slice(0, 73));
    expect(await collectJournalPages(read)).toEqual(records);
    expect(read).toHaveBeenCalledTimes(18);
  });
  it("fails instead of returning partial rows when another page fails", async () => {
    const read = vi.fn().mockResolvedValueOnce([{ id: "a" }]).mockRejectedValueOnce(new Error("connection lost"));
    await expect(collectJournalPages(read)).rejects.toThrow("connection lost");
  });
  it("rejects a non-advancing or duplicated cursor", async () => {
    await expect(collectJournalPages(async () => [{ id: "a" }])).rejects.toThrow("did not advance");
  });
  it("does not publish results after cancellation while a page was loading", async () => {
    const abort = new AbortController();
    await expect(collectJournalPages(async () => { abort.abort(); return [{ id: "a" }]; }, abort.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
