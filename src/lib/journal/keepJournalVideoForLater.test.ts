import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enqueue: vi.fn(), clear: vi.fn(), list: vi.fn() }));
vi.mock("./journalVideoRecordingRecovery", () => ({ clearInProgressJournalVideoRecording: mocks.clear, listInProgressJournalVideoRecordings: mocks.list }));
vi.mock("./journalVideoUploadQueue", () => ({ enqueueFinalizedJournalVideoCaptureForRecovery: mocks.enqueue }));
import { keepJournalVideoForLater } from "./keepJournalVideoForLater";
const result = { video: new Blob(["recording"]), audio: null, recoveryDraftId: "take-1", liveTranscript: "words", peakLiveTranscript: "words", chapters: [], durationMs: 5000 };
const owner = { userId: "user-1", entryId: "entry-1", anchorOffset: 0 };
beforeEach(() => { vi.resetAllMocks(); mocks.list.mockReturnValue([]); mocks.enqueue.mockResolvedValue({}); mocks.clear.mockResolvedValue(undefined); });
describe("keep video for later", () => {
  it("does not release recovery when the durable queue write fails", async () => {
    mocks.enqueue.mockRejectedValue(new Error("Storage full"));
    await expect(keepJournalVideoForLater(result, owner)).rejects.toThrow("Storage full");
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("releases the recovery copy only after the full recording is queued", async () => {
    await keepJournalVideoForLater(result, owner);
    expect(mocks.enqueue.mock.invocationCallOrder[0]).toBeLessThan(mocks.clear.mock.invocationCallOrder[0]);
  });
  it("refuses a recording belonging to another entry/account", async () => {
    mocks.list.mockReturnValue([{ id: "take-1", userId: "other", entryId: "entry-1" }]);
    await expect(keepJournalVideoForLater(result, owner)).rejects.toThrow("different journal entry");
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
