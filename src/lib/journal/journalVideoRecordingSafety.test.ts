import { afterEach, describe, expect, it, vi } from "vitest";
import { canChangeJournalVideoDevices } from "./journalVideoLiveDevices";
import { DEFAULT_JOURNAL_VIDEO_CAPTURE_SETTINGS, writeJournalVideoCaptureSettings } from "./journalVideoCaptureSettings";
import { journalVideoEffectiveRemainingMs, JOURNAL_VIDEO_RECORD_STOP_BYTES } from "./journalVideoLimits";
afterEach(() => vi.restoreAllMocks());
describe("video recording device and limit safety", () => {
  it.each(["recording", "paused", "processing", "idle"])("does not replace recorder tracks while %s", (phase) => {
    expect(canChangeJournalVideoDevices(phase)).toBe(false);
  });
  it.each(["preview", "countdown"])("allows choosing devices during %s", (phase) => {
    expect(canChangeJournalVideoDevices(phase)).toBe(true);
  });
  it("keeps silence auto-pause opt-in and tolerates blocked settings storage", () => {
    expect(DEFAULT_JOURNAL_VIDEO_CAPTURE_SETTINGS.silenceAutoPause).toBe(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage blocked"); });
    expect(() => writeJournalVideoCaptureSettings({ countdown: 5 })).not.toThrow();
  });
  it("uses the actual bitrate when the device greatly exceeds the requested bitrate", () => {
    const elapsed = 60_000;
    const bytes = JOURNAL_VIDEO_RECORD_STOP_BYTES / 2;
    expect(journalVideoEffectiveRemainingMs(elapsed, bytes)).toBe(elapsed);
  });
});
