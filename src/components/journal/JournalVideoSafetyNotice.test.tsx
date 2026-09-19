import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { JournalVideoSafetyNotice } from "./JournalVideoSafetyNotice";
import type { UseJournalVideoCaptureApi } from "@/hooks/useJournalVideoCapture";
const backup = vi.hoisted(() => vi.fn());
vi.mock("@/lib/journal/journalVideoBackup", () => ({ downloadJournalVideoBackup: backup }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const capture = (patch: Partial<UseJournalVideoCaptureApi> = {}) => ({ phase: "recording", durableBackupState: "idle", ...patch }) as UseJournalVideoCaptureApi;
const props = { health: null, onStop: vi.fn(), onCloseKept: vi.fn(), onDiscard: vi.fn(), onRecheck: vi.fn() };
describe("recording safety controls", () => {
  it("is silent on normal successful recording", () => {
    render(<JournalVideoSafetyNotice {...props} capture={capture()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("shows a storage failure while recording, without requiring Pause", () => {
    render(<JournalVideoSafetyNotice {...props} capture={capture({ durableBackupState: "at-risk", durableBackupError: "quota" })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Local backup needs attention");
    fireEvent.click(screen.getByRole("button", { name: "Stop and preserve recording" })); expect(props.onStop).toHaveBeenCalledOnce();
  });
  it("never presents a delayed finalization as a completed Save", async () => {
    const keep = vi.fn().mockRejectedValue(new Error("No durable chunks"));
    const video = new Blob(["partial"]);
    render(<JournalVideoSafetyNotice {...props} capture={capture({ phase: "processing", finalizationDelayed: true,
      getPartialRecording: () => video, keepUnfinishedRecording: keep })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Finishing recording");
    expect(screen.queryByRole("button", { name: "Save video" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download recovered part" }));
    expect(backup).toHaveBeenCalledWith(video, "incomplete-recovered-part"); expect(props.onDiscard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep recovery and close" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No durable chunks"));
    expect(props.onCloseKept).not.toHaveBeenCalled();
  });
});
