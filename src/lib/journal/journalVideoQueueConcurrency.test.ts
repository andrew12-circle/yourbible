import { Blob as NodeBlob } from "node:buffer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  enqueueJournalVideoUpload, readQueuedJournalVideoUpload, listQueuedJournalVideoUploads,
  updateQueuedJournalVideoUpload, JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY,
  type QueuedJournalVideoUpload,
} from "./journalVideoUploadQueue";
import { uploadQueuedJournalVideo, saveJournalVideoCaptureWithQueue } from "./journalVideoUploadProcessor";

const network = vi.hoisted(() => ({ upload: vi.fn(), insert: vi.fn(), transcribe: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("./journalAiAccess", () => ({ canUseJournalCloudAi: async () => true, PRIVATE_JOURNAL_AI_MESSAGE: "private" }));
vi.mock("./journalDocuments", () => ({ peekJournalDocument: () => null, journalSnapshotRow: () => ({}) }));
vi.mock("./journalVideoEntryMerge", () => ({ bodySnapFromMeta: () => null, persistVideoJournalTranscriptToEntry: async () => {} }));
vi.mock("./journalVideoRecordingRecovery", () => ({ clearInProgressJournalVideoRecording: async () => {} }));
vi.mock("./videos", () => ({
  uploadEntryVideo: (...args: unknown[]) => network.upload(...args),
  insertEntryVideo: (...args: unknown[]) => network.insert(...args),
  transcribeJournalVideo: (...args: unknown[]) => network.transcribe(...args),
  updateEntryVideoTranscript: async () => {},
}));
const meta = (id: string): QueuedJournalVideoUpload => ({ id, userId: "user", entryId: "entry", durationMs: 5000,
  anchorOffset: 0, liveTranscript: "", stage: "queued", createdAt: new Date().toISOString() });
const video = new NodeBlob(["complete-video"], { type: "video/webm" }) as unknown as Blob;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory()); localStorage.removeItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY);
  network.upload.mockReset().mockResolvedValue({ storage_path: "user/entry/take.webm" });
  network.insert.mockReset().mockResolvedValue({ id: "remote-video" });
  network.transcribe.mockReset().mockResolvedValue({ text: "", disposition: "terminal-no-speech" });
});
afterEach(() => { vi.unstubAllGlobals(); localStorage.removeItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY); });

describe("independent recording uploads and durable local saves", () => {
  it("commits recording B while recording A's network upload is stalled", async () => {
    await enqueueJournalVideoUpload(meta("A"), video, null);
    const stalled = deferred<{ storage_path: string }>(); network.upload.mockReturnValueOnce(stalled.promise);
    const uploadA = uploadQueuedJournalVideo(meta("A"));
    await vi.waitFor(() => expect(network.upload).toHaveBeenCalledOnce());
    const saveB = await saveJournalVideoCaptureWithQueue({ userId: "user", entryId: "entry", durationMs: 5000, anchorOffset: 0, deferUpload: true,
      result: { video, audio: null, liveTranscript: "", peakLiveTranscript: "", chapters: [], durationMs: 5000, recoveryDraftId: "B" } });
    expect(saveB.saved.status).toBe("queued");
    expect((await readQueuedJournalVideoUpload("B"))?.video.size).toBe(video.size);
    expect(listQueuedJournalVideoUploads("user").map((row) => row.id)).toEqual(["A", "B"]);
    stalled.resolve({ storage_path: "user/entry/A.webm" }); await uploadA;
    expect(listQueuedJournalVideoUploads("user").map((row) => row.id)).toEqual(["B"]);
  });
  it("serializes duplicate consumers and rereads removal before starting a second upload", async () => {
    await enqueueJournalVideoUpload(meta("A"), video, null);
    const stalled = deferred<{ storage_path: string }>(); network.upload.mockReturnValueOnce(stalled.promise);
    const first = uploadQueuedJournalVideo(meta("A"));
    const second = uploadQueuedJournalVideo(meta("A"));
    await vi.waitFor(() => expect(network.upload).toHaveBeenCalledOnce());
    stalled.resolve({ storage_path: "user/entry/A.webm" }); await Promise.all([first, second]);
    expect(network.upload).toHaveBeenCalledOnce(); expect(network.insert).toHaveBeenCalledOnce();
    expect(network.transcribe).toHaveBeenCalledOnce(); expect(listQueuedJournalVideoUploads("user")).toEqual([]);
  });
  it("does not lose unrelated metadata when enqueue and upload checkpoint writes overlap", async () => {
    await enqueueJournalVideoUpload(meta("A"), video, null);
    await Promise.all([
      updateQueuedJournalVideoUpload("A", { stage: "transcribing", videoId: "remote-A", storagePath: "user/entry/A.webm" }),
      enqueueJournalVideoUpload(meta("B"), video, null),
      updateQueuedJournalVideoUpload("A", { transcriptionAttemptCount: 2 }),
    ]);
    const rows = listQueuedJournalVideoUploads("user");
    expect(rows.find((row) => row.id === "A")).toMatchObject({ videoId: "remote-A", transcriptionAttemptCount: 2, stage: "transcribing" });
    expect(rows.some((row) => row.id === "B")).toBe(true);
  });
  it("keeps remote checkpoints on a repeated durable handoff", async () => {
    await enqueueJournalVideoUpload(meta("A"), video, null);
    await updateQueuedJournalVideoUpload("A", { videoId: "remote-A", storagePath: "user/entry/A.webm", stage: "deferred-transcription" });
    await enqueueJournalVideoUpload(meta("A"), video, null);
    expect(listQueuedJournalVideoUploads("user")[0]).toMatchObject({ videoId: "remote-A", stage: "deferred-transcription" });
  });
  it("does not let a waiting consumer ignore the first transcription failure's backoff", async () => {
    await enqueueJournalVideoUpload(meta("A"), video, null);
    network.transcribe.mockResolvedValueOnce({ text: "", error: "Provider unavailable", disposition: "retryable-error" });
    const results = await Promise.all([uploadQueuedJournalVideo(meta("A")), uploadQueuedJournalVideo(meta("A"))]);
    expect(network.upload).toHaveBeenCalledOnce();
    expect(network.transcribe).toHaveBeenCalledOnce();
    expect(results.map(result => result.status)).toEqual(["deferred-transcription", "deferred-transcription"]);
    expect(listQueuedJournalVideoUploads("user")[0]).toMatchObject({ stage: "deferred-transcription", videoId: "remote-video" });
  });
});
