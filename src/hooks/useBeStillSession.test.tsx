import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBeStillSession } from "./useBeStillSession";
import { createBeStillSession, parseBeStillSession, serializeBeStillSession } from "@/lib/prayer/beStill";
import { JournalSaveQueue, type JournalPendingDraft, type JournalSnapshot, type JournalValues } from "@/lib/journal/journalSaveQueue";
import { useJournalVaultStore } from "@/stores/journalVaultStore";

const h = vi.hoisted(() => ({
  create: vi.fn(), open: vi.fn(), policy: vi.fn(), notebook: vi.fn(), deleted: vi.fn(),
  auth: vi.fn(), write: vi.fn(), persist: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: h.auth } } }));
vi.mock("@/lib/journal/journals", () => ({ getDefaultJournalId: h.notebook }));
vi.mock("@/lib/journal/journalEntryDb", () => ({ journalEncryptionRequired: h.policy }));
vi.mock("@/lib/journal/journalDraftStorage", () => ({ journalEntryWasDeleted: h.deleted }));
vi.mock("@/lib/journal/journalDocuments", () => ({ createLocalJournalDocument: h.create, openJournalDocument: h.open }));

const pointer = (owner = "owner") => `yb_be_still_active_v1:${owner}`;
const queues = new Map<string, JournalSaveQueue>();
const drafts = new Map<string, JournalPendingDraft>();

function makeQueue(base: JournalSnapshot) {
  const queue = new JournalSaveQueue(base, {
    write: h.write,
    persist: async (draft) => {
      await h.persist(draft);
      if (draft) drafts.set(base.id, draft); else drafts.delete(base.id);
    },
    read: async () => { throw new Error("Unexpected conflict read"); },
  });
  queues.set(base.id, queue);
  return queue;
}

beforeEach(() => {
  localStorage.clear();
  queues.clear(); drafts.clear();
  vi.clearAllMocks();
  useJournalVaultStore.setState({ locking: false, lockEpoch: 0, e2eEnabled: false, dek: null, e2eRequiredJournalIds: new Set() });
  h.auth.mockResolvedValue({ data: { session: { user: { id: "owner" } } }, error: null });
  h.notebook.mockResolvedValue("notebook");
  h.policy.mockResolvedValue(false);
  h.deleted.mockResolvedValue(false);
  h.persist.mockResolvedValue(undefined);
  h.write.mockImplementation(async (base: JournalSnapshot, patch: JournalValues) => ({
    ...base, revision: (base.revision ?? 0) + 1, values: { ...base.values, ...patch },
  }));
  h.create.mockImplementation((userId: string, id: string, values: JournalValues, encrypted: boolean) =>
    makeQueue({ userId, id, values, encrypted, revision: null }));
  h.open.mockImplementation(async (owner: string, id: string) => {
    const queue = queues.get(id);
    if (!queue || queue.current().userId !== owner) throw new Error("Entry not found");
    return queue;
  });
});

describe("Be Still journal persistence", () => {
  it("keeps questions in a protected draft, stores only its ID in browser pointers, and resumes it", async () => {
    h.policy.mockResolvedValue(true);
    const first = renderHook(() => useBeStillSession("owner", "morning"));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    await act(async () => { await first.result.current.start(); });
    const id = first.result.current.session!.id;
    act(() => first.result.current.update({ stage: "question", question: "How can I love my family well?" }));
    await waitFor(() => expect(first.result.current.draftStatus).toBe("saved"));
    expect(h.policy).toHaveBeenCalledWith("owner", "notebook");
    expect(h.create.mock.calls[0][3]).toBe(true);
    expect(h.write).not.toHaveBeenCalled();
    expect(localStorage.getItem(pointer())).toBe(id);
    expect(JSON.stringify(localStorage)).not.toContain("love my family");
    expect(queues.get(id)!.current().values.tags).toContain("be-still-draft");
    first.unmount();

    const resumed = renderHook(() => useBeStillSession("owner", "prayer"));
    await waitFor(() => expect(resumed.result.current.session?.id).toBe(id));
    expect(resumed.result.current.session?.question).toBe("How can I love my family well?");
    expect(resumed.result.current.session?.entryPoint).toBe("morning");
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(h.write).not.toHaveBeenCalled();
  });

  it("keeps the original identity and completion intent when saving fails, then retries once acknowledged", async () => {
    const { result } = renderHook(() => useBeStillSession("owner", "prayer"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.start(); });
    const id = result.current.session!.id;
    act(() => result.current.update({ stage: "reflect", outcome: "nothing-clear" }));
    h.write.mockRejectedValueOnce(new Error("Connection lost"));
    await act(async () => { await result.current.complete(); });
    const attemptedAt = result.current.session!.completedAt;
    expect(result.current.completed).toBe(false);
    expect(result.current.error).toBe("Connection lost");
    expect(localStorage.getItem(pointer())).toBe(id);
    expect(drafts.has(id)).toBe(true);

    await act(async () => { await result.current.retry(); });
    expect(result.current.completed).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.session!.completedAt).toBe(attemptedAt);
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(h.write.mock.calls.map(([base]) => (base as JournalSnapshot).id)).toEqual([id, id]);
    expect(queues.get(id)!.current().values.tags).toEqual(["be-still", "listening-prayer"]);
    expect(localStorage.getItem(pointer())).toBeNull();
    expect(drafts.has(id)).toBe(false);
  });

  it("creates a single session for repeated start clicks and ignores identity changes in field patches", async () => {
    const { result } = renderHook(() => useBeStillSession("owner", "prayer"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await Promise.all([result.current.start(), result.current.start()]); });
    const id = result.current.session!.id;
    act(() => result.current.update({ id: crypto.randomUUID(), question: "One question" }));
    await waitFor(() => expect(result.current.draftStatus).toBe("saved"));
    expect(result.current.session!.id).toBe(id);
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(parseBeStillSession(String(queues.get(id)!.current().values.body))!.id).toBe(id);
  });

  it("shows completion when the global retry acknowledges an explicitly finished session", async () => {
    const { result } = renderHook(() => useBeStillSession("owner", "prayer"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.start(); });
    const id = result.current.session!.id;
    h.write.mockRejectedValueOnce(new Error("Temporarily offline"));
    await act(async () => { await result.current.complete(); });
    expect(result.current.completed).toBe(false);
    expect(result.current.error).toBe("Temporarily offline");
    await act(async () => { await queues.get(id)!.flush(); });
    expect(result.current.completed).toBe(true);
    expect(result.current.error).toBeNull();
    expect(localStorage.getItem(pointer())).toBeNull();
  });

  it("does not create an old user's draft after the account changes during policy loading", async () => {
    let resolvePolicy!: (value: boolean) => void;
    h.policy.mockReturnValueOnce(new Promise<boolean>((resolve) => { resolvePolicy = resolve; }));
    const { result, rerender } = renderHook(({ owner }) => useBeStillSession(owner, "prayer"), { initialProps: { owner: "owner" } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let start!: Promise<void>;
    act(() => { start = result.current.start(); });
    await waitFor(() => expect(h.policy).toHaveBeenCalled());
    h.auth.mockResolvedValue({ data: { session: { user: { id: "other" } } }, error: null });
    rerender({ owner: "other" });
    await act(async () => { resolvePolicy(false); await start; });
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
    expect(h.create).not.toHaveBeenCalled();
    expect(localStorage.getItem(pointer())).toBeNull();
    expect(localStorage.getItem(pointer("other"))).toBeNull();
  });

  it("honors deletion tombstones instead of resurrecting a prayer from its pointer", async () => {
    const id = crypto.randomUUID();
    localStorage.setItem(pointer(), id);
    h.deleted.mockResolvedValue(true);
    const { result } = renderHook(() => useBeStillSession("owner", "prayer"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(h.open).not.toHaveBeenCalled();
    expect(h.create).not.toHaveBeenCalled();
    expect(localStorage.getItem(pointer())).toBeNull();
  });

  it("recognizes a previously acknowledged completed session without inserting again", async () => {
    const session = { ...createBeStillSession("morning"), completedAt: new Date().toISOString() };
    makeQueue({ id: session.id, userId: "owner", revision: 3, encrypted: false,
      values: { body: serializeBeStillSession(session), tags: ["be-still", "listening-prayer"] } });
    localStorage.setItem(pointer(), session.id);
    const { result } = renderHook(() => useBeStillSession("owner", "prayer"));
    await waitFor(() => expect(result.current.completed).toBe(true));
    expect(result.current.session!.id).toBe(session.id);
    expect(localStorage.getItem(pointer())).toBeNull();
    expect(h.write).not.toHaveBeenCalled();
  });

  it("opens the exact recovery link even when the browser pointer is missing", async () => {
    const session = { ...createBeStillSession("prayer"), question: "Resume this exact question" };
    makeQueue({ id: session.id, userId: "owner", revision: null, encrypted: false,
      values: { body: serializeBeStillSession(session), tags: ["be-still", "be-still-draft"] } });
    const { result } = renderHook(() => useBeStillSession("owner", "prayer", session.id));
    await waitFor(() => expect(result.current.session?.id).toBe(session.id));
    expect(result.current.session?.question).toBe("Resume this exact question");
    expect(localStorage.getItem(pointer())).toBe(session.id);
    expect(h.write).not.toHaveBeenCalled();
  });

  it("never makes a cloud write when the latest local backup fails", async () => {
    const { result } = renderHook(() => useBeStillSession("owner", "prayer"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.start(); });
    h.persist.mockRejectedValue(new Error("Device storage is full"));
    act(() => result.current.update({ reflection: "Keep these words" }));
    await waitFor(() => expect(result.current.error).toBe("Device storage is full"));
    await act(async () => { await result.current.complete(); });
    expect(result.current.completed).toBe(false);
    expect(result.current.session?.reflection).toBe("Keep these words");
    expect(h.write).not.toHaveBeenCalled();
    expect(localStorage.getItem(pointer())).toBe(result.current.session!.id);
    h.persist.mockResolvedValue(undefined);
    await act(async () => { await result.current.retry(); });
    expect(result.current.completed).toBe(true);
  });
});
