import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { JournalPendingRecordings } from "./JournalPendingRecordings";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY } from "@/lib/journal/journalVideoUploadQueue";
import { JOURNAL_VIDEO_RECOVERY_META_KEY } from "@/lib/journal/journalVideoRecordingRecovery";
vi.mock("@/lib/native/journalVideoNative", () => ({ listPendingNativeJournalVideoCaptures: async () => [],
  nativeJournalVideoRecoveryHref: () => null, NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT: "native-test" }));
afterEach(() => { cleanup(); localStorage.clear(); useJournalVaultStore.setState({ locking: false, e2eEnabled: false, dek: null }); });
const item = (userId: string, id: string) => ({ userId, id, entryId: `entry-${id}`, stage: "queued", createdAt: new Date().toISOString(), durationMs: 1000 });
describe("account-wide pending recordings", () => {
  it("shows all the current user's entries but not another user's queue", async () => {
    localStorage.setItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY, JSON.stringify([item("A","one"),item("A","two"),item("B","private")]));
    render(<MemoryRouter><JournalPendingRecordings userId="A" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Pending recordings" }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Open entry" })).toHaveLength(2));
    expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).not.toContain("/journal/entry-private/edit");
  });
  it("hides an open pending view immediately on account switch or vault lock", async () => {
    localStorage.setItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY, JSON.stringify([item("A","one")]));
    const view = render(<MemoryRouter><JournalPendingRecordings userId="A" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Pending recordings" }));
    await screen.findByRole("dialog");
    view.rerender(<MemoryRouter><JournalPendingRecordings userId="B" /></MemoryRouter>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pending recordings" }));
    await screen.findByRole("dialog");
    act(() => useJournalVaultStore.setState({ locking: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("labels retained partial recovery separately from uploads", async () => {
    localStorage.setItem(JOURNAL_VIDEO_RECOVERY_META_KEY, JSON.stringify([{...item("A","part"),startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
      status:"finalizing",finalizationIncomplete:true,ownershipReleasedAt:new Date().toISOString(),videoChunkCount:2}]));
    render(<MemoryRouter><JournalPendingRecordings userId="A" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Pending recordings" }));
    await screen.findByText(/has not been automatically uploaded/);
    expect(screen.getByRole("button", { name: "Download recovered part" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Retry now" })).not.toBeInTheDocument();
  });
});
