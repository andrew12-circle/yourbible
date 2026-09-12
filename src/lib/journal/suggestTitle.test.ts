import { beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: h.invoke } } }));
import { suggestJournalEntryTitle } from "./suggestTitle";
beforeEach(() => h.invoke.mockReset().mockResolvedValue({ data: { title: "Faithful today", persisted: true }, error: null }));
describe("safe persisted journal title requests", () => {
  it("uses the backend entry_id contract without sending local plaintext", async () => {
    expect((await suggestJournalEntryTitle({ entryId: "entry", body: "private text" })).ok).toBe(true);
    expect(h.invoke).toHaveBeenCalledWith("journal-suggest-title", { body: { entry_id: "entry" } });
  });
  it("preserves the unpersisted result so callers cannot claim a skipped write saved", async () => {
    h.invoke.mockResolvedValueOnce({ data: { title: "Suggestion", persisted: false, skipped: true }, error: null });
    expect(await suggestJournalEntryTitle({ entryId: "entry" })).toMatchObject({ persisted: false, skipped: true });
  });
});
