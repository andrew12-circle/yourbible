import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
import { MorningJournalCapture } from "./MorningJournalCapture";
const m = vi.hoisted(() => ({ user: { id: "owner" }, private: false, openDoc: vi.fn(), save: vi.fn(), dialog: null as null | { onComplete: (r: JournalVideoCaptureResult, d: number) => Promise<void>; recovery: { entryId: string; userId: string }; allowTranscription: boolean } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: m.user, profile: { user_id: m.user.id, journal_e2e_enabled: m.private } }) }));
vi.mock("@/stores/journalVaultStore", () => ({ useJournalVaultStore: (fn: (v: { locking: boolean }) => unknown) => fn({ locking: false }) }));
vi.mock("./MorningFormulaInlineJournal", () => ({ flushMorningInlineJournals: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/hooks/useJournalEntryVideos", () => ({ useJournalEntryVideos: () => ({ videos: [], reload: vi.fn(), error: null }) }));
vi.mock("@/components/journal/JournalEntryVideos", () => ({ default: () => null }));
vi.mock("@/components/journal/JournalVideoTransferStatus", () => ({ JournalVideoTransferStatus: () => <p>Actual transfer status</p> }));
vi.mock("@/lib/journal/journalDocuments", () => ({ refreshJournalDocument: m.openDoc }));
vi.mock("@/lib/journal/journalAiPolicy", () => ({ journalCloudAiAllowed: (row: { entry_kind?: string }) => row.entry_kind !== "vent" }));
vi.mock("@/lib/journal/journalVideoUploadProcessor", () => ({ saveJournalVideoCaptureWithQueue: m.save }));
vi.mock("@/lib/journal/videos", () => ({ journalVideoCaptureSupported: () => true }));
vi.mock("@/components/journal/JournalVideoCaptureDialog", () => ({ default: (props: NonNullable<typeof m.dialog>) => { m.dialog = props; return <div role="dialog">Existing recorder</div>; } }));
const result = { video: new Blob(["video"], { type: "video/webm" }), audio: null, durationMs: 1000, liveTranscript: "My prayer", peakLiveTranscript: "My prayer" } as JournalVideoCaptureResult;
beforeEach(() => {
  m.user = { id: "owner" }; m.private = false; m.dialog = null;
  m.openDoc.mockReset().mockResolvedValue({ id: "one-entry", body: "## What's on my heart\n\nMy note\n\n## Listening\n\nQuiet", entry_kind: "morning_conversation" });
  m.save.mockReset().mockResolvedValue({ queued: true, saved: { status: "queued" } });
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:local-video"), revokeObjectURL: vi.fn() }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const mount = () => render(<MemoryRouter><MorningJournalCapture entryId="one-entry" /></MemoryRouter>);
describe("Existing recorder inside Morning Formula", () => {
  it("opens the canonical document and reuses the same entry's recovery and upload queue", async () => {
    mount(); fireEvent.click(screen.getByRole("button", { name: /Record my video journal/ }));
    await screen.findByRole("dialog");
    expect(m.openDoc).toHaveBeenCalledWith("owner", "one-entry");
    expect(m.dialog?.recovery).toMatchObject({ userId: "owner", entryId: "one-entry" });
    await act(() => m.dialog!.onComplete(result, 1000));
    expect(m.save).toHaveBeenCalledWith(expect.objectContaining({ userId: "owner", entryId: "one-entry", deferUpload: true, bodySnap: { body: expect.stringContaining("My note"), anchor: expect.any(Number) } }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/local copy/)).toBeTruthy();
    expect(screen.queryByText("Video and transcript saved")).toBeNull();
  });
  it("retains the recorder on a queue failure", async () => {
    m.save.mockRejectedValue(new Error("Storage is full"));
    mount(); fireEvent.click(screen.getByRole("button", { name: /Record my video journal/ }));
    await screen.findByRole("dialog");
    await act(async () => { await expect(m.dialog!.onComplete(result, 1000)).rejects.toThrow("Storage is full"); });
    expect(screen.getByRole("dialog")).toBeTruthy(); expect(screen.getByRole("alert")).toHaveTextContent("Storage is full");
  });
  it("does not offer inline capture for a locked/private-journal profile", () => {
    m.private = true; mount();
    expect(screen.getByRole("button", { name: /Record my video journal/ })).toBeDisabled();
    expect(m.openDoc).not.toHaveBeenCalled();
  });
  it("preserves the no-cloud-AI policy of private vents", async () => {
    m.openDoc.mockResolvedValue({ body: "Private", entry_kind: "vent" });
    mount(); fireEvent.click(screen.getByRole("button", { name: /Record my video journal/ }));
    await screen.findByRole("dialog"); expect(m.dialog?.allowTranscription).toBe(false);
  });
  it("discards a stale asynchronous opening after the account changes", async () => {
    let resolve!: (row: object) => void;
    m.openDoc.mockReturnValue(new Promise((r) => { resolve = r; }));
    const view = mount(); fireEvent.click(screen.getByRole("button", { name: /Record my video journal/ }));
    await waitFor(() => expect(m.openDoc).toHaveBeenCalled());
    m.user = { id: "other-owner" };
    view.rerender(<MemoryRouter><MorningJournalCapture key="other-owner" entryId="other-entry" /></MemoryRouter>);
    await act(async () => resolve({ body: "Old account's writing" }));
    expect(screen.queryByRole("dialog")).toBeNull(); expect(m.save).not.toHaveBeenCalled();
  });
});
