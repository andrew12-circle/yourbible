import { afterEach, describe, expect, it, vi } from "vitest";
import { retryJournalVideoUpload } from "./retryJournalVideoUpload";
import {
  JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY,
  journalVideoQueueNextRetryDelay,
  listQueuedJournalVideoUploads,
  type QueuedJournalVideoUpload,
} from "./journalVideoUploadQueue";
const item = (id: string, stage: QueuedJournalVideoUpload["stage"]): QueuedJournalVideoUpload => ({
  id, stage, userId: "user", entryId: "entry", anchorOffset: 0, durationMs: 10000,
  liveTranscript: "", createdAt: new Date().toISOString(), lastAttemptAt: new Date().toISOString(),
  attemptCount: 4, videoId: "remote-" + id, storagePath: "user/entry/" + id + ".webm",
});
afterEach(() => { localStorage.removeItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY); vi.restoreAllMocks(); });
describe("manual journal video retry", () => {
  it("runs immediately without retrying another item's backoff or losing checkpoints", async () => {
    localStorage.setItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY, JSON.stringify([item("chosen", "failed"), item("later", "deferred-transcription")]));
    expect(await retryJournalVideoUpload("user", "entry", "chosen")).toBe(true);
    const rows = listQueuedJournalVideoUploads("user");
    expect(journalVideoQueueNextRetryDelay(rows)).toBe(0);
    expect(rows[0]).toMatchObject({ stage: "queued", videoId: "remote-chosen", storagePath: "user/entry/chosen.webm" });
    expect(journalVideoQueueNextRetryDelay([rows[1]])).toBeGreaterThan(800000);
  });
  it("refuses a different account, different entry, or an in-flight recording", async () => {
    localStorage.setItem(JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY, JSON.stringify([item("chosen", "uploading")]));
    expect(await retryJournalVideoUpload("other", "entry", "chosen")).toBe(false);
    expect(await retryJournalVideoUpload("user", "other", "chosen")).toBe(false);
    expect(await retryJournalVideoUpload("user", "entry", "chosen")).toBe(false);
    expect(listQueuedJournalVideoUploads("user")[0].stage).toBe("uploading");
  });
});
