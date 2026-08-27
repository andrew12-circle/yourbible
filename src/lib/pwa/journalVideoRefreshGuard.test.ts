import { beforeEach, describe, expect, it } from "vitest";
import { journalVideoBlocksAppRefresh } from "@/lib/pwa/journalVideoRefreshGuard";
import {
  setJournalVideoRecordingActiveInPage,
  startInProgressJournalVideoRecording,
  updateInProgressJournalVideoRecording,
} from "@/lib/journal/journalVideoRecordingRecovery";

describe("PWA refresh safety during video journaling", () => {
  beforeEach(() => localStorage.clear());

  it("blocks a refresh while a recording lease is fresh", () => {
    startInProgressJournalVideoRecording({
      id: "recording-1",
      userId: "user-1",
      entryId: "entry-1",
      anchorOffset: 0,
      durationMs: 0,
      liveTranscript: "",
      peakLiveTranscript: "",
      videoMimeType: "video/webm",
      audioMimeType: null,
      chapters: [],
      ownerId: "tab-1",
    });

    expect(journalVideoBlocksAppRefresh()).toBe(true);
  });

  it("allows a refresh only after a finalized review explicitly releases ownership", () => {
    startInProgressJournalVideoRecording({
      id: "recording-1",
      userId: "user-1",
      entryId: "entry-1",
      anchorOffset: 0,
      durationMs: 0,
      liveTranscript: "",
      peakLiveTranscript: "",
      videoMimeType: "video/webm",
      audioMimeType: null,
      chapters: [],
    });
    updateInProgressJournalVideoRecording("recording-1", { status: "ready" });

    expect(journalVideoBlocksAppRefresh()).toBe(true);
    setJournalVideoRecordingActiveInPage("recording-1", false);
    expect(journalVideoBlocksAppRefresh()).toBe(false);
  });
});
