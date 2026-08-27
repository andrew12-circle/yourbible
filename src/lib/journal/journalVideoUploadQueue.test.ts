import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFinalizedJournalVideoRecoveryQueueMeta,
  enqueueJournalVideoUpload,
  journalVideoQueueStorageAddedIds,
  withJournalVideoUploadQueueLock,
} from "@/lib/journal/journalVideoUploadQueue";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("journal video upload queue coordination", () => {
  it("runs normally when Web Locks are unavailable", async () => {
    const work = vi.fn(async () => "done");
    vi.stubGlobal("navigator", {});

    await expect(withJournalVideoUploadQueueLock(work)).resolves.toEqual({
      claimed: true,
      value: "done",
    });
    expect(work).toHaveBeenCalledOnce();
  });

  it("does not process when another tab owns the queue lock", async () => {
    const work = vi.fn(async () => "done");
    const request = vi.fn(
      async (
        _name: string,
        _options: LockOptions,
        callback: (lock: Lock | null) => Promise<unknown>,
      ) => callback(null),
    );
    vi.stubGlobal("navigator", { locks: { request } });

    await expect(withJournalVideoUploadQueueLock(work)).resolves.toEqual({ claimed: false });
    expect(work).not.toHaveBeenCalled();
  });

  it("fails closed when an advertised queue lock rejects", async () => {
    const work = vi.fn(async () => "done");
    vi.stubGlobal("navigator", {
      locks: { request: vi.fn(async () => Promise.reject(new Error("disabled"))) },
    });

    await expect(withJournalVideoUploadQueueLock(work)).resolves.toEqual({ claimed: false });
    expect(work).not.toHaveBeenCalled();
  });

  it("uses a waiting lock for Blob enqueue instead of ifAvailable", async () => {
    const request = vi.fn(async () => Promise.reject(new Error("stop before IndexedDB")));
    vi.stubGlobal("navigator", { locks: { request } });

    await expect(
      enqueueJournalVideoUpload(
        {
          id: "recording-1",
          userId: "user-1",
          entryId: "entry-1",
          anchorOffset: 0,
          durationMs: 1_000,
          liveTranscript: "words",
          createdAt: "2026-08-27T12:00:00.000Z",
        },
        new Blob(["video"]),
        null,
      ),
    ).rejects.toThrow("stop before IndexedDB");
    expect(request.mock.calls[0][1]).toEqual({ mode: "exclusive" });
  });

  it("detects only newly added queue ids across storage events", () => {
    const oldValue = JSON.stringify([{ id: "existing", stage: "queued" }]);
    const updateOnly = JSON.stringify([{ id: "existing", stage: "uploading" }]);
    const withAddition = JSON.stringify([
      { id: "existing", stage: "uploading" },
      { id: "new", stage: "queued" },
    ]);

    expect(journalVideoQueueStorageAddedIds(oldValue, updateOnly)).toEqual([]);
    expect(journalVideoQueueStorageAddedIds(updateOnly, withAddition)).toEqual(["new"]);
    expect(journalVideoQueueStorageAddedIds(withAddition, oldValue)).toEqual([]);
  });

  it("builds a stable recovery-id queue checkpoint", () => {
    const meta = buildFinalizedJournalVideoRecoveryQueueMeta(
      {
        video: new Blob(["video"]),
        audio: null,
        liveTranscript: "live words",
        peakLiveTranscript: "best live words",
        chapters: [],
        durationMs: 12_000,
        recoveryDraftId: "recording-1",
      },
      {
        id: "recording-1",
        userId: "user-1",
        entryId: "entry-1",
        anchorOffset: 7,
        durationMs: 11_000,
        bodySnapBody: "before",
        bodySnapAnchor: 5,
        startedAt: "2026-08-27T12:00:00.000Z",
      },
    );

    expect(meta).toEqual(
      expect.objectContaining({
        id: "recording-1",
        userId: "user-1",
        entryId: "entry-1",
        anchorOffset: 7,
        durationMs: 12_000,
        bodySnapBody: "before",
        stage: "queued",
      }),
    );
  });
});
