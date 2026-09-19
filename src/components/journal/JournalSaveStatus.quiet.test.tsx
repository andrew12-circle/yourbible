import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalSaveState } from "@/lib/journal/journalSaveQueue";
import { JournalSaveStatus } from "./JournalSaveStatus";

const harness = vi.hoisted(() => ({ state: undefined as JournalSaveState | undefined, retry: vi.fn(), resolve: vi.fn() }));
vi.mock("@/lib/journal/journalDocuments", () => ({
  JOURNAL_DOCUMENT_CHANGED: "journal-save-status-test",
  peekJournalDocument: (user: string, entry: string) => user === "user-a" && entry === "entry-a" ? {
    getState: () => harness.state,
    getRemoteConflict: () => ({ values: { body: "Cloud version" } }),
    resolveConflict: harness.resolve,
  } : undefined,
  flushJournalDocument: harness.retry,
}));
function update(patch: Partial<JournalSaveState>) {
  act(() => {
    harness.state = { ...harness.state!, ...patch };
    window.dispatchEvent(new CustomEvent("journal-save-status-test", { detail: { userId: "user-a", entryId: "entry-a" } }));
  });
}
beforeEach(() => {
  harness.state = { status: "saved", durable: true, error: null, conflicts: [],
    snapshot: { id: "entry-a", userId: "user-a", revision: 1, encrypted: false, values: { body: "My local version" } } };
  harness.retry.mockReset().mockResolvedValue({ ok: true });
  harness.resolve.mockReset().mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("quiet journal autosave", () => {
  it("renders no label or layout spacer during every routine save state", () => {
    const { container } = render(<JournalSaveStatus userId="user-a" entryId="entry-a" />);
    for (const status of ["saved", "pending", "saving", "saved"] as const) {
      for (const durable of [false, true]) {
        update({ status, durable });
        expect(container.childElementCount).toBe(0);
        expect(screen.queryByRole("status")).toBeNull();
      }
    }
    expect(harness.retry).not.toHaveBeenCalled();
  });
  it("does not put recording text in the status area even when passed by a legacy caller", () => {
    const legacy = { userId: "user-a", entryId: "entry-a", liveCaption: "Words belong in the journal" };
    const { container } = render(<JournalSaveStatus {...legacy} />);
    update({ status: "saving", durable: true });
    expect(container.childElementCount).toBe(0);
    expect(screen.queryByText(/Words belong|Live captions/)).toBeNull();
  });
  it("shows genuine save failure and retains the retry action", () => {
    const { container } = render(<JournalSaveStatus userId="user-a" entryId="entry-a" />);
    update({ status: "error", durable: true, error: "Network unavailable" });
    expect(screen.getByRole("status").textContent).toContain("Cloud save needs attention");
    expect(screen.getByRole("alert").textContent).toBe("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    expect(harness.retry).toHaveBeenCalledWith("user-a", "entry-a");
    update({ status: "saved", error: null });
    expect(container.childElementCount).toBe(0);
  });
  it("warns when even the device copy is not durable", () => {
    render(<JournalSaveStatus userId="user-a" entryId="entry-a" />);
    update({ status: "error", durable: false, error: "Device storage full" });
    expect(screen.getByRole("status").textContent).toBe("Not saved — keep this entry open");
  });
  it("preserves explicit conflict review and resolution", async () => {
    render(<JournalSaveStatus userId="user-a" entryId="entry-a" />);
    update({ status: "conflict", conflicts: ["body"], error: "Conflict" });
    fireEvent.click(screen.getByRole("button", { name: "Review both versions" }));
    expect(screen.getByLabelText("Reviewed body")).toHaveProperty("value", "My local version");
    fireEvent.click(screen.getByRole("button", { name: "Use cloud value" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save reviewed changes" })); });
    expect(harness.resolve).toHaveBeenCalledWith({ body: "Cloud version" });
  });
});
