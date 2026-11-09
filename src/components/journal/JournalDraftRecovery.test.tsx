import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JournalDraftRecovery } from "./JournalDraftRecovery";
import { useJournalVaultStore } from "@/stores/journalVaultStore";

const h = vi.hoisted(() => ({ list: vi.fn(), decode: vi.fn(), open: vi.fn(), retry: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/lib/journal/journalDraftStorage", () => ({ listJournalDrafts: h.list, decodeJournalDraft: h.decode, JOURNAL_DRAFT_CHANGED: "draft-changed" }));
vi.mock("@/lib/journal/journalDocuments", () => ({
  openJournalDocument: h.open, retryJournalDocuments: h.retry,
  isLocalOnlyJournalDraft: (values: { tags?: string[] }) => values.tags?.includes("be-still-draft") ?? false,
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useJournalVaultStore.setState({ dek: null, e2eEnabled: false, locking: false });
  h.open.mockResolvedValue(undefined);
});

const show = () => render(<MemoryRouter initialEntries={["/journal"]}><JournalDraftRecovery /></MemoryRouter>);

describe("Be Still recovery navigation", () => {
  it("returns an unfinished Be Still draft to its own session instead of the general editor", async () => {
    h.list.mockResolvedValue([{ entryId: "prayer-id", encrypted: false }, { entryId: "entry-id", encrypted: false }]);
    h.decode.mockImplementation(async (row: { entryId: string }) => ({
      base: { values: { tags: row.entryId === "prayer-id" ? ["be-still-draft"] : [] } }, pending: {},
    }));
    show();
    expect(await screen.findByRole("link", { name: "Resume Be Still" })).toHaveAttribute("href", "/prayer/be-still?session=prayer-id");
    expect(screen.getByRole("link", { name: "Review draft 2" })).toHaveAttribute("href", "/journal/entry-id/edit");
  });

  it("does not decrypt locked drafts or expose their content in recovery", async () => {
    localStorage.setItem("yb_be_still_active_v1:owner", "private-prayer");
    h.list.mockResolvedValue([{ entryId: "private-prayer", encrypted: true }, { entryId: "private-entry", encrypted: true }]);
    show();
    expect(await screen.findByRole("link", { name: "Resume Be Still" })).toHaveAttribute("href", "/prayer/be-still?session=private-prayer");
    expect(screen.getByRole("link", { name: "Unlock journal to recover" })).toHaveAttribute("href", "/settings?section=privacy");
    await waitFor(() => expect(h.list).toHaveBeenCalled());
    expect(h.decode).not.toHaveBeenCalled();
    expect(h.open).not.toHaveBeenCalled();
  });
});
