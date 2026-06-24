import { describe, expect, it } from "vitest";
import {
  formatJournalVideoClock,
  formatJournalVideoSizeMb,
  isJournalVideoUploadTooLarge,
  journalVideoEffectiveRemainingMs,
  journalVideoRemainingMs,
  JOURNAL_VIDEO_MAX_DURATION_MS,
  JOURNAL_VIDEO_MAX_UPLOAD_BYTES,
  JOURNAL_VIDEO_RECORD_STOP_BYTES,
  shouldStopJournalVideoRecording,
} from "@/lib/journal/journalVideoLimits";

describe("formatJournalVideoClock", () => {
  it("formats minutes and seconds", () => {
    expect(formatJournalVideoClock(90_000)).toBe("1:30");
    expect(formatJournalVideoClock(0)).toBe("0:00");
  });

  it("formats hours when needed", () => {
    expect(formatJournalVideoClock(3_661_000)).toBe("1:01:01");
  });
});

describe("journalVideoRemainingMs", () => {
  it("counts down from the 30-minute cap", () => {
    expect(journalVideoRemainingMs(0)).toBe(JOURNAL_VIDEO_MAX_DURATION_MS);
    expect(journalVideoRemainingMs(JOURNAL_VIDEO_MAX_DURATION_MS)).toBe(0);
    expect(journalVideoRemainingMs(JOURNAL_VIDEO_MAX_DURATION_MS + 5_000)).toBe(0);
  });
});

describe("journalVideoEffectiveRemainingMs", () => {
  it("uses the tighter of time and observed file size", () => {
    const elapsed = 60_000;
    const bytes = JOURNAL_VIDEO_RECORD_STOP_BYTES / 2;
    expect(journalVideoEffectiveRemainingMs(elapsed, bytes)).toBeLessThan(
      journalVideoRemainingMs(elapsed),
    );
  });
});

describe("shouldStopJournalVideoRecording", () => {
  it("stops at duration or size cap", () => {
    expect(shouldStopJournalVideoRecording(0, JOURNAL_VIDEO_MAX_DURATION_MS)).toBe(true);
    expect(shouldStopJournalVideoRecording(JOURNAL_VIDEO_RECORD_STOP_BYTES, 0)).toBe(true);
    expect(shouldStopJournalVideoRecording(1024, 60_000)).toBe(false);
  });
});

describe("isJournalVideoUploadTooLarge", () => {
  it("flags blobs over the upload cap", () => {
    expect(isJournalVideoUploadTooLarge(JOURNAL_VIDEO_MAX_UPLOAD_BYTES)).toBe(false);
    expect(isJournalVideoUploadTooLarge(JOURNAL_VIDEO_MAX_UPLOAD_BYTES + 1)).toBe(true);
  });
});

describe("formatJournalVideoSizeMb", () => {
  it("formats megabytes", () => {
    expect(formatJournalVideoSizeMb(5 * 1024 * 1024)).toBe("5 MB");
  });
});
