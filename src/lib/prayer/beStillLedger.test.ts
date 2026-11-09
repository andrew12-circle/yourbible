import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBeStillSession, parseBeStillSession, serializeBeStillSession } from "./beStill";
import { listBeStillLedger, reviewBeStillLedgerEntry } from "./beStillLedger";

const h = vi.hoisted(() => ({
  auth: vi.fn(), range: vi.fn(), detail: vi.fn(), open: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: h.auth }, from: () => ({
    select: () => ({ eq: () => ({ contains: () => ({ order: () => ({ range: h.range }) }) }) }),
  }) },
}));
vi.mock("@/lib/journal/journalEntryDb", () => ({ fetchJournalEntryDetail: h.detail }));
vi.mock("@/lib/journal/journalDocuments", () => ({ openJournalDocument: h.open }));

const valid = () => ({ ...createBeStillSession("prayer"), completedAt: "2026-11-09T18:00:00.000Z",
  thoughtOrigin: "arrived" as const, reflection: "A complete thought" });

beforeEach(() => {
  vi.clearAllMocks();
  h.auth.mockResolvedValue({ data: { session: { user: { id: "owner" } } }, error: null });
});

describe("receiving ledger", () => {
  it("lists saved completed sessions through owner-scoped journal reads", async () => {
    const session = valid();
    h.range.mockResolvedValue({ data: [{ id: session.id }], error: null });
    h.detail.mockResolvedValue({ id: session.id, body: serializeBeStillSession(session), contentLocked: false });
    const page = await listBeStillLedger("owner");
    expect(page.sessions).toHaveLength(1);
    expect(page.sessions[0].thoughtOrigin).toBe("arrived");
    expect(page.hasMore).toBe(false);
    expect(h.detail).toHaveBeenCalledWith(session.id, "owner");
  });

  it("requires the actual authenticated account and never reads another user's ledger", async () => {
    h.auth.mockResolvedValue({ data: { session: { user: { id: "other" } } }, error: null });
    await expect(listBeStillLedger("owner")).rejects.toThrow("Sign in");
    expect(h.range).not.toHaveBeenCalled();
    expect(h.detail).not.toHaveBeenCalled();
  });

  it("blocks viewing private locked content", async () => {
    const session = valid();
    h.range.mockResolvedValue({ data: [{ id: session.id }], error: null });
    h.detail.mockResolvedValue({ id: session.id, contentLocked: true, body: "Encrypted entry" });
    await expect(listBeStillLedger("owner")).rejects.toThrow("Unlock");
  });

  it("saves a later outcome on the original entry, leaving unrelated journal notes untouched", async () => {
    const session = valid();
    const body = serializeBeStillSession(session) + "\n\n## Added after saving\n\nLeave this unchanged.";
    const pending = { id: session.id, userId: "owner", values: { body } };
    const patch = vi.fn((values: { body: string }) => { pending.values.body = values.body; });
    const flush = vi.fn().mockImplementation(async () => ({
      ok: true, snapshot: { ...pending, revision: 2 },
    }));
    h.open.mockResolvedValue({ current: () => pending, patch, flush });
    const updated = await reviewBeStillLedgerEntry("owner", session.id, "confirmed", "Evidence over time");
    expect(updated.verification).toBe("confirmed");
    expect(updated.verificationNotes).toBe("Evidence over time");
    expect(pending.values.body).toContain("Leave this unchanged.");
    expect(parseBeStillSession(pending.values.body)?.id).toBe(session.id);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("does not claim a successful outcome when the server fails to acknowledge it", async () => {
    const session = valid();
    const pending = { id: session.id, userId: "owner", values: { body: serializeBeStillSession(session) } };
    h.open.mockResolvedValue({ current: () => pending, patch: vi.fn(), flush: vi.fn().mockResolvedValue({
      ok: false, error: new Error("Could not save") }) });
    await expect(reviewBeStillLedgerEntry("owner", session.id, "confirmed", "Test")).rejects.toThrow("Could not save");
  });
});
