import { beforeEach, describe, expect, it, vi } from "vitest";

const persistMock = vi.hoisted(() => vi.fn());
const uploadEntryVideoMock = vi.hoisted(() => vi.fn());
const insertEntryVideoMock = vi.hoisted(() => vi.fn());
const transcribeJournalVideoMock = vi.hoisted(() => vi.fn());
const updateEntryVideoTranscriptMock = vi.hoisted(() => vi.fn());
const enqueueMock = vi.hoisted(() => vi.fn());
const listQueueMock = vi.hoisted(() => vi.fn());
const readQueueMock = vi.hoisted(() => vi.fn());
const removeQueueMock = vi.hoisted(() => vi.fn());
const updateQueueMock = vi.hoisted(() => vi.fn());
const waitingQueueLockMock = vi.hoisted(() => vi.fn());
const clearRecoveryMock = vi.hoisted(() => vi.fn());
const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

vi.mock("@/lib/journal/journalVideoEntryMerge", () => ({
  persistVideoJournalTranscriptToEntry: (...args: unknown[]) => persistMock(...args),
  bodySnapFromMeta: (body?: string | null, anchor?: number | null) =>
    body == null || anchor == null ? null : { body, anchor },
}));

vi.mock("@/lib/journal/journalVideoRecordingRecovery", () => ({
  clearInProgressJournalVideoRecording: (...args: unknown[]) => clearRecoveryMock(...args),
}));

vi.mock("@/lib/journal/journalVideoUploadQueue", () => ({
  enqueueJournalVideoUpload: (...args: unknown[]) => enqueueMock(...args),
  listQueuedJournalVideoUploads: (...args: unknown[]) => listQueueMock(...args),
  readQueuedJournalVideoUpload: (...args: unknown[]) => readQueueMock(...args),
  removeQueuedJournalVideoUpload: (...args: unknown[]) => removeQueueMock(...args),
  updateQueuedJournalVideoUpload: (...args: unknown[]) => updateQueueMock(...args),
  withJournalVideoUploadQueueWaitingLock: (work: () => Promise<unknown>) =>
    waitingQueueLockMock(work),
}));

vi.mock("@/lib/journal/videos", () => ({
  uploadEntryVideo: (...args: unknown[]) => uploadEntryVideoMock(...args),
  insertEntryVideo: (...args: unknown[]) => insertEntryVideoMock(...args),
  transcribeJournalVideo: (...args: unknown[]) => transcribeJournalVideoMock(...args),
  updateEntryVideoTranscript: (...args: unknown[]) => updateEntryVideoTranscriptMock(...args),
}));

import {
  isTerminalJournalVideoTranscriptionError,
  processJournalVideoUploadQueue,
  recoverAndSaveJournalVideoRecording,
  saveJournalVideoCaptureWithQueue,
  uploadQueuedJournalVideo,
} from "@/lib/journal/journalVideoUploadProcessor";

const video = new Blob(["fake-video-bytes"], { type: "video/webm" });

const baseMeta = {
  id: "recording-1",
  userId: "u1",
  entryId: "e1",
  anchorOffset: 0,
  durationMs: 60_000,
  liveTranscript: "I was journaling for a long time about my day",
  peakLiveTranscript: "I was journaling for a long time about my day and my week",
  chapters: [],
  createdAt: "2026-08-27T00:00:00.000Z",
};

describe("journal video durable upload processing", () => {
  beforeEach(() => {
    persistMock.mockReset().mockResolvedValue("merged body");
    uploadEntryVideoMock
      .mockReset()
      .mockResolvedValue({ storage_path: "u1/e1/recording-1.webm" });
    insertEntryVideoMock.mockReset().mockResolvedValue({ id: "vid1" });
    transcribeJournalVideoMock.mockReset().mockResolvedValue({
      text: "A complete server transcript about everything that happened.",
      source: "storage-video",
      error: null,
      serverTranscriptSucceeded: true,
      disposition: "complete",
    });
    updateEntryVideoTranscriptMock.mockReset().mockResolvedValue(undefined);
    enqueueMock.mockReset().mockResolvedValue(undefined);
    listQueueMock.mockReset().mockReturnValue([]);
    readQueueMock.mockReset().mockResolvedValue({ video, audio: null, chapters: [] });
    removeQueueMock.mockReset().mockResolvedValue(undefined);
    updateQueueMock.mockReset().mockReturnValue(baseMeta);
    waitingQueueLockMock.mockReset().mockImplementation((work: () => Promise<unknown>) => work());
    clearRecoveryMock.mockReset().mockResolvedValue(undefined);
    getSessionMock.mockReset().mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });
  });

  it("saves the transcript even when the recovered video blob is empty", async () => {
    const saved = await recoverAndSaveJournalVideoRecording(
      baseMeta,
      new Blob([], { type: "video/webm" }),
      null,
    );

    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledWith(
      "u1",
      "e1",
      expect.stringContaining("and my week"),
      0,
      null,
    );
    expect(enqueueMock).not.toHaveBeenCalled();
    expect(uploadEntryVideoMock).not.toHaveBeenCalled();
    expect(saved.transcript).toContain("and my week");
  });

  it("hands recovered bytes to the queue before clearing recovery or uploading", async () => {
    uploadEntryVideoMock.mockRejectedValue(new Error("network down"));

    await expect(recoverAndSaveJournalVideoRecording(baseMeta, video, null)).rejects.toThrow(
      "network down",
    );

    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "recording-1", userId: "u1" }),
      video,
      null,
      [],
    );
    expect(enqueueMock.mock.invocationCallOrder[0]).toBeLessThan(
      clearRecoveryMock.mock.invocationCallOrder[0],
    );
    expect(clearRecoveryMock.mock.invocationCallOrder[0]).toBeLessThan(
      uploadEntryVideoMock.mock.invocationCallOrder[0],
    );
    expect(removeQueueMock).not.toHaveBeenCalled();
  });

  it("uses one stable recording id when retrying after upload and row insertion", async () => {
    transcribeJournalVideoMock
      .mockRejectedValueOnce(new Error("worker connection reset"))
      .mockResolvedValue({
        text: "A complete server transcript after retry.",
        source: "storage-video",
        error: null,
        serverTranscriptSucceeded: true,
        disposition: "complete",
      });

    await expect(uploadQueuedJournalVideo(baseMeta)).rejects.toThrow("worker connection reset");
    await uploadQueuedJournalVideo({
      ...baseMeta,
      storagePath: "u1/e1/recording-1.webm",
      videoId: "vid1",
      transcriptionAttemptCount: 1,
    });

    expect(uploadEntryVideoMock).toHaveBeenCalledTimes(1);
    expect(insertEntryVideoMock).toHaveBeenCalledTimes(1);
    expect(uploadEntryVideoMock).toHaveBeenCalledWith(
      "u1",
      "e1",
      video,
      60_000,
      "recording-1",
    );
    expect(transcribeJournalVideoMock).toHaveBeenCalledTimes(2);
    expect(removeQueueMock).toHaveBeenCalledTimes(1);
  });

  it("propagates a body merge failure and retains the queued Blob", async () => {
    persistMock.mockRejectedValue(new Error("entry update conflict"));

    await expect(uploadQueuedJournalVideo(baseMeta)).rejects.toThrow("entry update conflict");

    expect(uploadEntryVideoMock).not.toHaveBeenCalled();
    expect(removeQueueMock).not.toHaveBeenCalled();
  });

  it("retains the queue when the final richer-transcript merge fails", async () => {
    persistMock
      .mockResolvedValueOnce("body with live transcript")
      .mockRejectedValueOnce(new Error("final merge conflict"));

    await expect(uploadQueuedJournalVideo(baseMeta)).rejects.toThrow("final merge conflict");

    expect(uploadEntryVideoMock).toHaveBeenCalledTimes(1);
    expect(updateEntryVideoTranscriptMock).toHaveBeenCalledTimes(1);
    expect(removeQueueMock).not.toHaveBeenCalled();
    const checkpointCallIndex = updateQueueMock.mock.calls.findIndex(
      ([, patch]) =>
        (patch as { transcriptionCompleted?: boolean }).transcriptionCompleted === true,
    );
    expect(checkpointCallIndex).toBeGreaterThanOrEqual(0);
    expect(updateQueueMock.mock.invocationCallOrder[checkpointCallIndex]).toBeLessThan(
      persistMock.mock.invocationCallOrder[1],
    );
  });

  it("resumes a final-body-merge checkpoint without local payload, upload, or STT", async () => {
    readQueueMock.mockResolvedValue(null);
    const preparedTranscript = "Prepared final transcript already stored on the video row.";

    const saved = await uploadQueuedJournalVideo({
      ...baseMeta,
      storagePath: "u1/e1/recording-1.webm",
      videoId: "vid1",
      transcriptionCompleted: true,
      finalTranscript: preparedTranscript,
    });

    expect(readQueueMock).not.toHaveBeenCalled();
    expect(uploadEntryVideoMock).not.toHaveBeenCalled();
    expect(insertEntryVideoMock).not.toHaveBeenCalled();
    expect(transcribeJournalVideoMock).not.toHaveBeenCalled();
    expect(persistMock).toHaveBeenCalledTimes(1);
    expect(persistMock).toHaveBeenCalledWith("u1", "e1", preparedTranscript, 0, null);
    expect(removeQueueMock).toHaveBeenCalledWith("recording-1");
    expect(saved.transcript).toBe(preparedTranscript);
  });

  it("keeps an uploaded video queued when transcription has a retryable failure", async () => {
    transcribeJournalVideoMock.mockResolvedValue({
      text: baseMeta.peakLiveTranscript,
      source: "live",
      error: "journal-voice-to-text is unreachable",
      serverTranscriptSucceeded: false,
      disposition: "retryable-error",
    });

    const saved = await uploadQueuedJournalVideo(baseMeta);

    expect(saved.status).toBe("deferred-transcription");
    expect(saved.uploaded).toBe(true);
    expect(removeQueueMock).not.toHaveBeenCalled();
    expect(updateQueueMock).toHaveBeenCalledWith(
      "recording-1",
      expect.objectContaining({
        stage: "deferred-transcription",
        lastError: "journal-voice-to-text is unreachable",
      }),
    );
  });

  it("completes a genuinely too-short recording instead of retrying forever", async () => {
    transcribeJournalVideoMock.mockResolvedValue({
      text: "",
      source: "none",
      error: "Audio was too short to transcribe — record a little longer.",
      serverTranscriptSucceeded: false,
      disposition: "terminal-no-speech",
    });

    const saved = await uploadQueuedJournalVideo({ ...baseMeta, durationMs: 2_000 });

    expect(saved.status).toBe("completed");
    expect(removeQueueMock).toHaveBeenCalledWith("recording-1");
    expect(isTerminalJournalVideoTranscriptionError(saved.sttError, 2_000)).toBe(true);
  });

  it("does not process another signed-in user's local queue", async () => {
    const otherUserMeta = { ...baseMeta, id: "recording-2", userId: "u2" };
    listQueueMock.mockImplementation((userId?: string) => {
      const rows = [baseMeta, otherUserMeta];
      return userId ? rows.filter((row) => row.userId === userId) : rows;
    });

    const result = await processJournalVideoUploadQueue();

    expect(readQueueMock).toHaveBeenCalledTimes(1);
    expect(readQueueMock).toHaveBeenCalledWith("recording-1");
    expect(result).toMatchObject({
      processed: 1,
      completed: 1,
      completedEntryIds: ["e1"],
      failed: 0,
      skipped: 1,
    });
  });

  it("reports deferred transcription separately from completed and failed retries", async () => {
    listQueueMock.mockImplementation((userId?: string) =>
      userId === "u1" ? [baseMeta] : [baseMeta],
    );
    transcribeJournalVideoMock.mockResolvedValue({
      text: baseMeta.peakLiveTranscript,
      source: "live",
      error: "temporary provider timeout",
      serverTranscriptSucceeded: false,
      disposition: "retryable-error",
    });

    const result = await processJournalVideoUploadQueue("u1");

    expect(result).toMatchObject({
      processed: 0,
      uploaded: 1,
      completed: 0,
      deferredTranscription: 1,
      failed: 0,
    });
  });

  it("clears crash recovery immediately after a new queue handoff commits", async () => {
    persistMock.mockRejectedValue(new Error("entry merge temporarily failed"));
    const result = {
      video,
      audio: null,
      durationMs: 60_000,
      liveTranscript: baseMeta.liveTranscript,
      peakLiveTranscript: baseMeta.peakLiveTranscript,
      chapters: [],
      recoveryDraftId: "draft-1",
    };

    const outcome = await saveJournalVideoCaptureWithQueue({
      userId: "u1",
      entryId: "e1",
      result,
      durationMs: 60_000,
      anchorOffset: 0,
    });

    expect(enqueueMock.mock.invocationCallOrder[0]).toBeLessThan(
      clearRecoveryMock.mock.invocationCallOrder[0],
    );
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "draft-1" }),
      video,
      null,
      [],
    );
    expect(clearRecoveryMock).toHaveBeenCalledWith("draft-1");
    expect(waitingQueueLockMock).toHaveBeenCalledOnce();
    expect(removeQueueMock).not.toHaveBeenCalled();
    expect(outcome.queued).toBe(true);
    expect(outcome.saved.status).toBe("deferred-retry");
  });
});
