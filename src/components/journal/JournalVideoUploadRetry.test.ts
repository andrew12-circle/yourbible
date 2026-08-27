import { describe, expect, it } from "vitest";
import {
  journalVideoQueueFreshAttemptDelay,
  journalVideoQueueNextRetryDelay,
  type QueuedJournalVideoUpload,
} from "@/lib/journal/journalVideoUploadQueue";

function queued(
  patch: Partial<QueuedJournalVideoUpload> = {},
): QueuedJournalVideoUpload {
  return {
    id: "recording-1",
    userId: "user-1",
    entryId: "entry-1",
    anchorOffset: 0,
    durationMs: 1_000,
    liveTranscript: "words",
    createdAt: "2026-08-27T12:00:00.000Z",
    stage: "queued",
    ...patch,
  };
}

describe("journal video queue retry scheduling", () => {
  it("defers a fresh in-flight normal save", () => {
    const now = Date.parse("2026-08-27T12:00:30.000Z");
    expect(
      journalVideoQueueFreshAttemptDelay(
        [
          queued({
            stage: "uploading",
            lastAttemptAt: "2026-08-27T12:00:00.000Z",
          }),
        ],
        now,
        60_000,
      ),
    ).toBe(30_000);
  });

  it("allows queued, failed, and expired attempts to retry immediately", () => {
    const now = Date.parse("2026-08-27T12:02:00.000Z");
    expect(
      journalVideoQueueFreshAttemptDelay(
        [
          queued(),
          queued({ stage: "failed", lastAttemptAt: "2026-08-27T12:01:59.000Z" }),
          queued({ stage: "transcribing", lastAttemptAt: "2026-08-27T12:00:00.000Z" }),
        ],
        now,
        60_000,
      ),
    ).toBe(0);
  });

  it("backs off a fresh deferred transcription by its attempt count", () => {
    const now = Date.parse("2026-08-27T12:00:10.000Z");

    expect(
      journalVideoQueueNextRetryDelay(
        [
          queued({
            stage: "deferred-transcription",
            attemptCount: 1,
            transcriptionAttemptCount: 1,
            lastAttemptAt: "2026-08-27T12:00:00.000Z",
          }),
        ],
        now,
      ),
    ).toBe(20_000);
    expect(
      journalVideoQueueNextRetryDelay(
        [
          queued({
            stage: "deferred-transcription",
            attemptCount: 2,
            transcriptionAttemptCount: 2,
            lastAttemptAt: "2026-08-27T12:00:00.000Z",
          }),
        ],
        now,
      ),
    ).toBe(110_000);
  });

  it("caps repeated failures at fifteen minutes and honors the longest row lease", () => {
    const now = Date.parse("2026-08-27T12:00:10.000Z");
    expect(
      journalVideoQueueNextRetryDelay(
        [
          queued({
            id: "first",
            stage: "failed",
            attemptCount: 1,
            lastAttemptAt: "2026-08-27T12:00:00.000Z",
          }),
          queued({
            id: "later",
            stage: "failed",
            attemptCount: 99,
            lastAttemptAt: "2026-08-27T12:00:00.000Z",
          }),
        ],
        now,
      ),
    ).toBe(890_000);
  });
});
