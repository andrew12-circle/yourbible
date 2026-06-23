import { describe, expect, it } from "vitest";
import {
  formatJournalVideoClock,
  isJournalVideoUploadTooLarge,
  journalVideoRemainingMs,
  JOURNAL_VIDEO_MAX_DURATION_MS,
  JOURNAL_VIDEO_MAX_UPLOAD_BYTES,
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

describe("isJournalVideoUploadTooLarge", () => {
  it("flags blobs over the upload cap", () => {
    expect(isJournalVideoUploadTooLarge(JOURNAL_VIDEO_MAX_UPLOAD_BYTES)).toBe(false);
    expect(isJournalVideoUploadTooLarge(JOURNAL_VIDEO_MAX_UPLOAD_BYTES + 1)).toBe(true);
  });
});
