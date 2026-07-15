import { beforeEach, describe, expect, it, vi } from "vitest";

const persistMock = vi.hoisted(() => vi.fn());
const uploadEntryVideoMock = vi.hoisted(() => vi.fn());
const insertEntryVideoMock = vi.hoisted(() => vi.fn());
const transcribeJournalVideoMock = vi.hoisted(() => vi.fn());
const updateEntryVideoTranscriptMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/journal/journalVideoEntryMerge", () => ({
  persistVideoJournalTranscriptToEntry: (...args: unknown[]) => persistMock(...args),
  bodySnapFromMeta: (body?: string | null, anchor?: number | null) =>
    body == null || anchor == null ? null : { body, anchor },
}));

vi.mock("@/lib/journal/videos", () => ({
  uploadEntryVideo: (...args: unknown[]) => uploadEntryVideoMock(...args),
  insertEntryVideo: (...args: unknown[]) => insertEntryVideoMock(...args),
  transcribeJournalVideo: (...args: unknown[]) => transcribeJournalVideoMock(...args),
  updateEntryVideoTranscript: (...args: unknown[]) => updateEntryVideoTranscriptMock(...args),
}));

import { recoverAndSaveJournalVideoRecording } from "@/lib/journal/journalVideoUploadProcessor";

const baseMeta = {
  userId: "u1",
  entryId: "e1",
  anchorOffset: 0,
  durationMs: 60_000,
  liveTranscript: "I was journaling for a long time about my day",
  peakLiveTranscript: "I was journaling for a long time about my day and my week",
  chapters: [],
};

describe("recoverAndSaveJournalVideoRecording — transcript-first hardening", () => {
  beforeEach(() => {
    persistMock.mockReset().mockResolvedValue("merged body");
    uploadEntryVideoMock.mockReset();
    insertEntryVideoMock.mockReset();
    transcribeJournalVideoMock.mockReset();
    updateEntryVideoTranscriptMock.mockReset();
  });

  it("saves the transcript even when the video blob is empty (glitched recording)", async () => {
    const emptyVideo = new Blob([], { type: "video/webm" });

    const saved = await recoverAndSaveJournalVideoRecording(baseMeta, emptyVideo, null);

    // Transcript was merged into the entry using the longest captured captions...
    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledWith(
      "u1",
      "e1",
      expect.stringContaining("journaling for a long time about my day and my week"),
      0,
      null,
    );
    // ...and no attempt was made to upload the (nonexistent) video.
    expect(uploadEntryVideoMock).not.toHaveBeenCalled();
    expect(saved.transcript).toContain("and my week");
  });

  it("merges the transcript BEFORE the video upload, so an upload failure never loses words", async () => {
    uploadEntryVideoMock.mockRejectedValue(new Error("network down"));
    const video = new Blob(["fake-bytes"], { type: "video/webm" });

    await expect(
      recoverAndSaveJournalVideoRecording(baseMeta, video, null),
    ).rejects.toThrow("network down");

    // The transcript was already committed to the entry before the upload threw.
    expect(persistMock).toHaveBeenCalledWith(
      "u1",
      "e1",
      expect.stringContaining("and my week"),
      0,
      null,
    );
  });

  it("re-merges the richer server transcript once the video uploads", async () => {
    uploadEntryVideoMock.mockResolvedValue({ storage_path: "path/v.webm" });
    insertEntryVideoMock.mockResolvedValue({ id: "vid1" });
    transcribeJournalVideoMock.mockResolvedValue({
      text: "I was journaling for a long time about my day and my week and everything that happened.",
      error: null,
    });
    updateEntryVideoTranscriptMock.mockResolvedValue(undefined);
    const video = new Blob(["fake-bytes"], { type: "video/webm" });

    await recoverAndSaveJournalVideoRecording(baseMeta, video, null);

    // Once for the live captions, once for the richer server transcript.
    expect(persistMock).toHaveBeenCalledTimes(2);
    expect(persistMock).toHaveBeenLastCalledWith(
      "u1",
      "e1",
      expect.stringContaining("everything that happened"),
      0,
      null,
    );
  });
});
