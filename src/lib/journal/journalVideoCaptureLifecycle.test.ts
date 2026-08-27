import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildJournalVideoFinalizationSummary,
  buildJournalVideoSalvageBlob,
  createJournalVideoChunkWriteCoordinator,
  createJournalVideoDataCheckpoint,
  journalVideoTracksCanResume,
  stopJournalVideoRecorderWithFallback,
} from "@/lib/journal/journalVideoCaptureLifecycle";

afterEach(() => {
  vi.useRealTimers();
});

describe("journal video capture lifecycle", () => {
  it("prefers a latched spontaneous-stop blob and otherwise salvages in-memory chunks", async () => {
    const latched = new Blob(["latched"], { type: "video/webm" });
    expect(buildJournalVideoSalvageBlob(latched, [new Blob(["other"])], "video/webm")).toBe(
      latched,
    );
    const salvaged = buildJournalVideoSalvageBlob(
      null,
      [new Blob(["one"]), new Blob(["two"])],
      "video/webm",
    );
    expect(await salvaged?.text()).toBe("onetwo");
  });

  it("returns inactive-recorder chunks instead of a destructive null stop", async () => {
    let resolver: ((blob: Blob | null) => void) | null = null;
    const outcome = await stopJournalVideoRecorderWithFallback({
      recorder: { state: "inactive" } as MediaRecorder,
      timeoutMs: 10,
      mimeType: "video/webm",
      getLatchedBlob: () => null,
      getChunks: () => [new Blob(["kept"])],
      setResolver: (next) => {
        resolver = next;
      },
      requestStop: vi.fn(() => true),
    });
    expect(outcome.stopped).toBe(true);
    expect(await outcome.blob?.text()).toBe("kept");
    expect(resolver).toBeNull();
  });

  it("bounds a stalled stop while keeping its resolver latched for a late final event", async () => {
    vi.useFakeTimers();
    let resolver: ((blob: Blob | null) => void) | null = null;
    const pending = stopJournalVideoRecorderWithFallback({
      recorder: { state: "recording" } as MediaRecorder,
      timeoutMs: 100,
      mimeType: "video/webm",
      getLatchedBlob: () => null,
      getChunks: () => [new Blob(["checkpoint"])],
      setResolver: (next) => {
        resolver = next;
      },
      requestStop: vi.fn(() => true),
    });
    await vi.advanceTimersByTimeAsync(100);
    const outcome = await pending;
    expect(outcome.stopped).toBe(false);
    expect(await outcome.blob?.text()).toBe("checkpoint");
    expect(resolver).toBeTypeOf("function");
    resolver?.(new Blob(["final"]));
    expect(await (await outcome.completion)?.text()).toBe("final");
  });

  it("serializes chunk writes and reports an observed persistence failure", async () => {
    const order: string[] = [];
    const errors: unknown[] = [];
    const writer = createJournalVideoChunkWriteCoordinator((error) => errors.push(error));
    writer.enqueue("video", async () => {
      order.push("first-start");
      await Promise.resolve();
      order.push("first-end");
    });
    writer.enqueue("video", async () => {
      order.push("second");
      throw new Error("disk full");
    });
    await expect(writer.drain()).rejects.toThrow("disk full");
    expect(order).toEqual(["first-start", "first-end", "second"]);
    expect(errors).toHaveLength(1);
    expect(writer.getError()).toBe("disk full");
  });

  it("waits for requested recorder checkpoints to publish data", async () => {
    const checkpoint = createJournalVideoDataCheckpoint();
    const recorder = { state: "paused", requestData: vi.fn() } as unknown as MediaRecorder;
    const pending = checkpoint.request(recorder, null, 100);
    expect(recorder.requestData).toHaveBeenCalledOnce();
    checkpoint.notify("video");
    await expect(pending).resolves.toBe(true);
  });

  it("requires live tracks to resume and only marks fully persisted output ready", () => {
    const liveTrack = { readyState: "live" } as MediaStreamTrack;
    const endedTrack = { readyState: "ended" } as MediaStreamTrack;
    expect(journalVideoTracksCanResume({ getTracks: () => [liveTrack] } as MediaStream)).toBe(true);
    expect(journalVideoTracksCanResume({ getTracks: () => [endedTrack] } as MediaStream)).toBe(
      false,
    );
    const summary = buildJournalVideoFinalizationSummary({
      videoBlob: new Blob(["video"]),
      audioBlob: null,
      videoChunks: [],
      audioChunks: [],
      recordersStopped: true,
      writesPersisted: true,
      persistenceError: null,
      now: "2026-08-27T00:00:00.000Z",
    });
    expect(summary.ready).toBe(true);
    expect(summary.patch).toMatchObject({
      status: "ready",
      finalizedAt: "2026-08-27T00:00:00.000Z",
      videoBytes: 5,
    });
  });
});
