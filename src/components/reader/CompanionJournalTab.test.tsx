import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompanion, type CompanionScope } from "@/lib/reader/companionStore";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { JournalSaveQueue, type JournalValues } from "@/lib/journal/journalSaveQueue";
const h = vi.hoisted(() => ({ user: "owner", policy: vi.fn(), write: vi.fn(), persist: vi.fn(), queues: new Map<string, any>(), create: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: h.user } }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/components/journal/JournalSaveStatus", () => ({ JournalSaveStatus: () => null }));
vi.mock("@/components/writing/PrivacyBlurInput", () => ({ PrivacyBlurInput: (props: any) => <input {...props} /> }));
vi.mock("@/components/writing/PolishedTextarea", () => ({ PolishedTextarea: ({ allowAiPolish, polishResetKey, ...props }: any) => <textarea {...props} data-ai={String(allowAiPolish)} /> }));
vi.mock("@/lib/journal/journalEntryDb", () => ({ journalEncryptionRequired: (...args: unknown[]) => h.policy(...args) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const query: any = { select: () => query, eq: () => query, order: () => query, contains: () => query, limit: () => Promise.resolve({ data: [], error: null }), insert: () => query, single: () => Promise.resolve({ data: { id: "link" }, error: null }) }; return query;
} } }));
vi.mock("@/lib/journal/journalDocuments", () => ({
  openJournalDocument: async (userId: string, id: string) => { const q = h.queues.get(`${userId}:${id}`); if (!q) throw new Error("not found"); return q; },
  createLocalJournalDocument: (userId: string, id: string, values: JournalValues, encrypted: boolean) => {
    h.create(userId, id, values, encrypted);
    const q = new JournalSaveQueue({ userId, id, values, encrypted, revision: null }, { persist: h.persist, read: async () => q.current(), write: async (base, patch) => { await h.write(); return { ...base, values: { ...base.values, ...patch }, revision: 1 }; } });
    h.queues.set(`${userId}:${id}`, q); return q;
  },
  patchJournalDocument: (userId: string, id: string, patch: JournalValues) => h.queues.get(`${userId}:${id}`).patch(patch),
}));
import { CompanionJournalTab, companionDraftPointer } from "./CompanionJournalTab";
const scope: CompanionScope = { book: "Jhn", bookName: "John", chapter: 1, verses: [1], passageText: "In the beginning" };
beforeEach(() => {
  h.user = "owner"; h.queues.clear(); h.create.mockReset(); h.policy.mockReset().mockResolvedValue(false); h.write.mockReset().mockResolvedValue(undefined); h.persist.mockReset().mockResolvedValue(undefined);
  localStorage.clear(); useCompanion.setState({ scope, tab: "journal", entryId: null }); useJournalVaultStore.setState({ dek: null });
});
afterEach(cleanup);
async function editor() { await waitFor(() => expect(screen.getByPlaceholderText(/What is this passage/)).toBeEnabled()); return screen.getByPlaceholderText(/What is this passage/); }
describe("Reader Companion journal durability and privacy", () => {
  it("stores only a user-scoped entry ID locally and creates one document while typing", async () => {
    render(<CompanionJournalTab />); const text = await editor();
    fireEvent.change(text, { target: { value: "private words" } }); fireEvent.change(text, { target: { value: "private words continued" } });
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(companionDraftPointer("owner", scope))).toBe(useCompanion.getState().entryId);
    expect(JSON.stringify(Object.values(localStorage))).not.toContain("private words");
    expect(h.queues.values().next().value.current().values.body).toBe("private words continued");
  });
  it("keeps typing and stays in the journal when saving fails", async () => {
    h.write.mockRejectedValue(new Error("offline")); render(<CompanionJournalTab />); const text = await editor();
    fireEvent.change(text, { target: { value: "Keep this writing" } });
    fireEvent.click(screen.getByRole("button", { name: /Save & Dialogue/ }));
    await waitFor(() => expect(h.write).toHaveBeenCalled());
    expect(useCompanion.getState().tab).toBe("journal"); expect(text).toHaveValue("Keep this writing");
    expect(h.queues.values().next().value.isDirty()).toBe(true);
  });
  it("never shows the previous user's text after an account switch", async () => {
    const view = render(<CompanionJournalTab />); fireEvent.change(await editor(), { target: { value: "Owner-only text" } });
    h.user = "other"; view.rerender(<CompanionJournalTab />);
    expect(screen.getByPlaceholderText(/What is this passage/)).toHaveValue("");
    await editor(); expect(screen.getByPlaceholderText(/What is this passage/)).toHaveValue("");
  });
  it("blocks writing for locked encrypted notebooks and disables AI polish after unlock", async () => {
    h.policy.mockResolvedValue(true); render(<CompanionJournalTab />);
    await waitFor(() => expect(screen.getByText(/Unlock your journal in Settings/)).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/What is this passage/)).toBeDisabled();
    await act(async () => useJournalVaultStore.setState({ dek: {} as CryptoKey }));
    const text = await editor(); expect(text).toHaveAttribute("data-ai", "false");
    fireEvent.change(text, { target: { value: "Protected" } }); expect(h.create.mock.calls[0][3]).toBe(true);
  });
  it("does not assign legacy unscoped plaintext drafts to the current account", async () => {
    localStorage.setItem("yb.companion.draft.Jhn.1.1", JSON.stringify({ body: "Unknown owner's words" }));
    render(<CompanionJournalTab />); expect(await editor()).toHaveValue("");
    expect(localStorage.getItem("yb.companion.draft.Jhn.1.1")).toContain("Unknown owner's words");
  });
});
