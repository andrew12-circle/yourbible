import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearInProgressJournalVideoRecording,
  JOURNAL_VIDEO_RECOVERY_STALE_MS,
  isJournalVideoRecordingRecoveryClaimable,
  listInProgressJournalVideoRecordings,
  setJournalVideoRecordingActiveInPage,
  startInProgressJournalVideoRecording,
  updateInProgressJournalVideoRecording,
  withJournalVideoRecoveryClaimLock,
  type JournalVideoRecordingRecoveryMeta,
} from "@/lib/journal/journalVideoRecordingRecovery";

const baseMeta = {
  id: "recording-1",
  userId: "user-1",
  entryId: "entry-1",
  anchorOffset: 0,
  durationMs: 0,
  liveTranscript: "",
  peakLiveTranscript: "",
  videoMimeType: "video/webm",
  audioMimeType: null,
  chapters: [],
};

function recoveryMeta(
  patch: Partial<JournalVideoRecordingRecoveryMeta> = {},
): JournalVideoRecordingRecoveryMeta {
  return {
    ...baseMeta,
    videoChunkCount: 1,
    audioChunkCount: 0,
    startedAt: "2026-08-27T12:00:00.000Z",
    updatedAt: "2026-08-27T12:00:05.000Z",
    status: "recording",
    heartbeatAt: "2026-08-27T12:00:05.000Z",
    ...patch,
  };
}

describe("journal video recording recovery leases", () => {
  beforeEach(() => {
    localStorage.clear();
    setJournalVideoRecordingActiveInPage("recording-1", false);
  });

  afterEach(() => {
    setJournalVideoRecordingActiveInPage("recording-1", false);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("creates an owned durable recording lease", () => {
    startInProgressJournalVideoRecording({ ...baseMeta, ownerId: "tab-a" });

    expect(listInProgressJournalVideoRecordings()).toEqual([
      expect.objectContaining({
        id: "recording-1",
        ownerId: "tab-a",
        status: "recording",
        videoChunkCount: 0,
        videoBytes: 0,
      }),
    ]);
  });

  it("does not let another tab claim a fresh recording or paused lease", () => {
    const now = Date.parse("2026-08-27T12:00:10.000Z");

    expect(isJournalVideoRecordingRecoveryClaimable(recoveryMeta(), now)).toBe(false);
    expect(
      isJournalVideoRecordingRecoveryClaimable(recoveryMeta({ status: "paused" }), now),
    ).toBe(false);
  });

  it("allows recovery after the owner heartbeat is stale", () => {
    const heartbeat = Date.parse("2026-08-27T12:00:05.000Z");

    expect(
      isJournalVideoRecordingRecoveryClaimable(
        recoveryMeta(),
        heartbeat + JOURNAL_VIDEO_RECOVERY_STALE_MS,
      ),
    ).toBe(true);
  });

  it("never lets the same page recover a recorder it still owns", () => {
    setJournalVideoRecordingActiveInPage("recording-1", true);

    expect(
      isJournalVideoRecordingRecoveryClaimable(
        recoveryMeta({ status: "ready" }),
        Date.parse("2026-08-27T12:10:00.000Z"),
      ),
    ).toBe(false);
  });

  it("keeps a fresh finalized review private until its owner explicitly releases it", () => {
    expect(
      isJournalVideoRecordingRecoveryClaimable(
        recoveryMeta({ status: "ready", finalizedAt: "2026-08-27T12:00:06.000Z" }),
        Date.parse("2026-08-27T12:00:07.000Z"),
      ),
    ).toBe(false);

    expect(
      isJournalVideoRecordingRecoveryClaimable(
        recoveryMeta({
          status: "ready",
          finalizedAt: "2026-08-27T12:00:06.000Z",
          ownershipReleasedAt: "2026-08-27T12:00:06.500Z",
        }),
        Date.parse("2026-08-27T12:00:07.000Z"),
      ),
    ).toBe(true);
  });

  it("eventually recovers a finalized draft whose owner crashed", () => {
    expect(
      isJournalVideoRecordingRecoveryClaimable(
        recoveryMeta({ status: "ready" }),
        Date.parse("2026-08-27T12:05:05.000Z"),
      ),
    ).toBe(true);
  });

  it("renews a live review heartbeat and durably marks its release", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));
    startInProgressJournalVideoRecording({ ...baseMeta, status: "ready" });
    setJournalVideoRecordingActiveInPage("recording-1", true);

    vi.advanceTimersByTime(60_000);
    const live = listInProgressJournalVideoRecordings()[0];
    expect(live.heartbeatAt).toBe("2026-08-27T12:01:00.000Z");
    expect(live.ownershipReleasedAt).toBeUndefined();
    expect(isJournalVideoRecordingRecoveryClaimable(live, Date.now())).toBe(false);

    setJournalVideoRecordingActiveInPage("recording-1", false);
    expect(listInProgressJournalVideoRecordings()[0].ownershipReleasedAt).toBe(
      "2026-08-27T12:01:00.000Z",
    );
  });

  it("does not run recovery while another tab holds the origin lock", async () => {
    const work = vi.fn(async () => "recovered");
    const request = vi.fn(
      async (
        _name: string,
        _options: LockOptions,
        callback: (lock: Lock | null) => Promise<unknown>,
      ) => callback(null),
    );
    vi.stubGlobal("navigator", { locks: { request } });

    await expect(withJournalVideoRecoveryClaimLock("recording-1", work)).resolves.toEqual({
      claimed: false,
    });
    expect(work).not.toHaveBeenCalled();
  });

  it("fails closed when an advertised lock manager rejects before claiming", async () => {
    const work = vi.fn(async () => "recovered");
    const request = vi.fn(async () => {
      throw new Error("locks disabled");
    });
    vi.stubGlobal("navigator", { locks: { request } });

    await expect(withJournalVideoRecoveryClaimLock("recording-1", work)).resolves.toEqual({
      claimed: false,
    });
    expect(work).not.toHaveBeenCalled();
  });

  it("does not overwrite or clear a malformed durable recovery index", async () => {
    localStorage.setItem("yb_journal_video_recording_recovery_v1", "not-json");

    expect(() => startInProgressJournalVideoRecording(baseMeta)).toThrow(
      "Could not read the journal video recovery index",
    );
    await expect(clearInProgressJournalVideoRecording("recording-1")).rejects.toThrow(
      "Could not read the journal video recovery index",
    );
    expect(localStorage.getItem("yb_journal_video_recording_recovery_v1")).toBe("not-json");
  });

  it("reports whether metadata heartbeats actually persisted", () => {
    expect(updateInProgressJournalVideoRecording("missing", { status: "paused" })).toBe(false);
    startInProgressJournalVideoRecording(baseMeta);
    expect(
      updateInProgressJournalVideoRecording("recording-1", {
        status: "paused",
        interruptionReason: "background",
      }),
    ).toBe(true);
    expect(listInProgressJournalVideoRecordings()[0]).toEqual(
      expect.objectContaining({ status: "paused", interruptionReason: "background" }),
    );
  });
});
