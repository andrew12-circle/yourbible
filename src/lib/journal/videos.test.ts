import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const uploadJournalVoiceMemoMock = vi.hoisted(() => vi.fn());
const transcribeJournalVoiceMemoMock = vi.hoisted(() => vi.fn());
const removeSidecarMock = vi.hoisted(() => vi.fn());
const createSignedUrlMock = vi.hoisted(() => vi.fn());
const supabaseFromMock = vi.hoisted(() => vi.fn());
const nativeCaptureSupportedMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/lib/native/journalVideoNative", () => ({
  nativeJournalVideoCaptureSupported: () => nativeCaptureSupportedMock(),
}));

vi.mock("@/lib/journal/voiceDictation", () => ({
  uploadJournalVoiceMemo: (...args: unknown[]) => uploadJournalVoiceMemoMock(...args),
  transcribeJournalVoiceMemo: (...args: unknown[]) => transcribeJournalVoiceMemoMock(...args),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        remove: (...args: unknown[]) => removeSidecarMock(...args),
        createSignedUrl: (...args: unknown[]) => createSignedUrlMock(...args),
      }),
    },
    from: (...args: unknown[]) => supabaseFromMock(...args),
  },
}));

import {
  buildJournalVideoStoragePath,
  buildJournalVideoConstraints,
  createJournalAudioSidecarRecorder,
  createJournalVideoMediaRecorder,
  createJournalVideoRecoveryId,
  deriveJournalVideoRecordingRowId,
  journalVideoRecorderTimesliceMs,
  journalVideoCaptureSupported,
  journalVideoTranscriptEmptyMessage,
  insertEntryVideo,
  pickJournalAudioMimeType,
  pickJournalVideoMimeType,
  startJournalMediaRecorder,
  transcribeJournalVideo,
  tuneJournalVideoStream,
} from "@/lib/journal/videos";

describe("journalVideoCaptureSupported", () => {
  beforeEach(() => {
    nativeCaptureSupportedMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses AVFoundation support in the iOS shell without requiring MediaRecorder", () => {
    nativeCaptureSupportedMock.mockReturnValue(true);
    vi.stubGlobal("MediaRecorder", undefined);
    vi.stubGlobal("navigator", {});

    expect(journalVideoCaptureSupported()).toBe(true);
  });

  it("still requires the browser recorder stack outside the native iOS shell", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    vi.stubGlobal("navigator", {});

    expect(journalVideoCaptureSupported()).toBe(false);
  });
});

describe("buildJournalVideoStoragePath", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses and sanitizes a durable recording id for crash-safe retries", () => {
    const first = buildJournalVideoStoragePath("user", "entry", "video/mp4", " draft/id 42 ");
    const retry = buildJournalVideoStoragePath("user", "entry", "video/mp4", " draft/id 42 ");
    expect(first).toEqual({ path: "user/entry/draft-id-42.mp4", idempotent: true });
    expect(retry).toEqual(first);
  });

  it.each([
    ["video/quicktime", "mov"],
    ["video/quicktime; codecs=avc1", "mov"],
    ["video/mp4", "mp4"],
    ["video/mp4; codecs=avc1", "mp4"],
  ])("maps %s to the matching upload container extension", (mime, extension) => {
    expect(buildJournalVideoStoragePath("user", "entry", mime, "native-recording")).toEqual({
      path: `user/entry/native-recording.${extension}`,
      idempotent: true,
    });
  });

  it("keeps one-off uploads random when no durable id exists", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "random-id" });
    expect(buildJournalVideoStoragePath("user", "entry", "video/webm")).toEqual({
      path: "user/entry/random-id.webm",
      idempotent: false,
    });
  });

  it("derives one valid deterministic row UUID from a legacy non-UUID recording id", async () => {
    const first = await deriveJournalVideoRecordingRowId("user", "entry", "rec-123-legacy");
    const retry = await deriveJournalVideoRecordingRowId("user", "entry", "rec-123-legacy");
    const anotherEntry = await deriveJournalVideoRecordingRowId(
      "user",
      "another-entry",
      "rec-123-legacy",
    );

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(retry).toBe(first);
    expect(anotherEntry).not.toBe(first);
  });
});

describe("transcribeJournalVideo retry disposition", () => {
  beforeEach(() => {
    uploadJournalVoiceMemoMock.mockReset().mockResolvedValue("user/journal-dictation/sidecar.webm");
    transcribeJournalVoiceMemoMock.mockReset();
    removeSidecarMock.mockReset().mockResolvedValue({ error: null });
  });

  it("keeps a transient storage-STT failure retryable when the sidecar was empty", async () => {
    transcribeJournalVoiceMemoMock
      .mockResolvedValueOnce({ ok: true, text: "" })
      .mockResolvedValueOnce({ ok: false, error: "temporary provider timeout" });

    const result = await transcribeJournalVideo("user/entry/video.webm", {
      userId: "user",
      audioBlob: new Blob([new Uint8Array(300)], { type: "audio/webm" }),
      liveTranscript: "A useful live transcript",
    });

    expect(result).toMatchObject({
      source: "live",
      serverTranscriptSucceeded: false,
      disposition: "retryable-error",
      error: "temporary provider timeout",
    });
    expect(removeSidecarMock).toHaveBeenCalledWith(["user/journal-dictation/sidecar.webm"]);
  });

  it("completes when storage STT succeeds even if longer live text wins selection", async () => {
    transcribeJournalVoiceMemoMock
      .mockResolvedValueOnce({ ok: false, error: "temporary sidecar timeout" })
      .mockResolvedValueOnce({ ok: true, text: "Server transcript" });

    const result = await transcribeJournalVideo("user/entry/video.webm", {
      userId: "user",
      audioBlob: new Blob([new Uint8Array(300)], { type: "audio/webm" }),
      liveTranscript:
        "This longer live transcript remains selected while server success controls retry state.",
    });

    expect(result.source).toBe("live");
    expect(result.serverTranscriptSucceeded).toBe(true);
    expect(result.disposition).toBe("complete");
    expect(result.error).toBeUndefined();
  });
});

describe("insertEntryVideo durable idempotency", () => {
  beforeEach(() => {
    supabaseFromMock.mockReset();
    createSignedUrlMock.mockReset().mockResolvedValue({
      data: { signedUrl: "https://signed.example/video" },
      error: null,
    });
  });

  it("ignores a duplicate UUID insert and returns the existing richer row", async () => {
    const canonical = {
      id: "11111111-1111-5111-8111-111111111111",
      entry_id: "entry",
      storage_path: "user/entry/recording.webm",
      duration_ms: 60_000,
      mime_type: "video/webm",
      transcript: "Already completed server transcript",
      anchor_offset: 0,
      created_at: "2026-08-27T00:00:00.000Z",
    };
    const existingLookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const canonicalLookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: canonical, error: null }),
    };
    supabaseFromMock
      .mockReturnValueOnce(existingLookup)
      .mockReturnValueOnce({ upsert })
      .mockReturnValueOnce(canonicalLookup);

    const row = await insertEntryVideo(
      "user",
      "entry",
      {
        storage_path: canonical.storage_path,
        duration_ms: 60_000,
        mime_type: "video/webm",
        recording_id: canonical.id,
      },
      { transcript: "Partial live transcript" },
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: canonical.id,
        transcript: "Partial live transcript",
      }),
      { onConflict: "id", ignoreDuplicates: true },
    );
    expect(row?.transcript).toBe("Already completed server transcript");
  });
});

describe("pickJournalVideoMimeType", () => {
  beforeEach(() => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (t: string) => t.startsWith("video/webm") || t === "video/mp4",
    });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns first supported webm variant on desktop", () => {
    expect(pickJournalVideoMimeType()).toBe("video/webm;codecs=vp9,opus");
  });

  it("prefers mp4 on iPhone when supported", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(pickJournalVideoMimeType()).toBe("video/mp4");
  });

  it("prefers mp4 on iPadOS desktop-class UA when supported", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      maxTouchPoints: 5,
    });
    expect(pickJournalVideoMimeType()).toBe("video/mp4");
  });

  it("returns empty when MediaRecorder missing", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    expect(pickJournalVideoMimeType()).toBe("");
  });
});

describe("createJournalVideoMediaRecorder", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back when bitrate options throw (Safari-style)", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    });
    class FakeRecorder {
      mimeType: string;
      static isTypeSupported(t: string) {
        return t === "video/mp4";
      }
      constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
        if (options?.videoBitsPerSecond != null) {
          throw new Error("NotSupportedError");
        }
        this.mimeType = options?.mimeType || "video/mp4";
      }
    }
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    const created = createJournalVideoMediaRecorder(stream);
    expect(created?.mimeType).toBe("video/mp4");
  });

  it("returns null when every constructor attempt fails", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
    class Boom {
      static isTypeSupported() {
        return true;
      }
      constructor() {
        throw new Error("fail");
      }
    }
    vi.stubGlobal("MediaRecorder", Boom);
    expect(createJournalVideoMediaRecorder({} as MediaStream)).toBeNull();
  });
});

describe("startJournalMediaRecorder", () => {
  it("falls back to start() when timeslice start throws", () => {
    const calls: unknown[] = [];
    const recorder = {
      state: "inactive",
      start(timeslice?: number) {
        calls.push(timeslice);
        if (timeslice != null) throw new Error("timeslice unsupported");
        this.state = "recording";
      },
    } as MediaRecorder;
    startJournalMediaRecorder(recorder, 1000);
    expect(calls).toEqual([1000, undefined]);
    expect(recorder.state).toBe("recording");
  });

  it("throws when recorder stays inactive", () => {
    const recorder = {
      state: "inactive",
      start() {
        /* no-op */
      },
    } as MediaRecorder;
    expect(() => startJournalMediaRecorder(recorder, 1000)).toThrow(/recording state/i);
  });
});

describe("createJournalVideoRecoveryId", () => {
  it("returns a non-empty id without randomUUID", () => {
    vi.stubGlobal("crypto", {});
    const id = createJournalVideoRecoveryId();
    expect(id.length).toBeGreaterThan(8);
    vi.unstubAllGlobals();
  });
});

describe("journalVideoRecorderTimesliceMs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses durable 1s chunks on Apple devices", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    });
    expect(journalVideoRecorderTimesliceMs()).toBe(1000);
  });

  it("uses durable 1s chunks on desktop Chrome too", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
    });
    expect(journalVideoRecorderTimesliceMs()).toBe(1000);
  });
});

describe("pickJournalAudioMimeType", () => {
  beforeEach(() => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (t: string) => t.startsWith("audio/"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns first supported audio variant", () => {
    expect(pickJournalAudioMimeType()).toBe("audio/webm;codecs=opus");
  });
});

describe("buildJournalVideoConstraints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses portrait dimensions and the front camera on a portrait iPhone", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      maxTouchPoints: 5,
    });
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844 });
    const c = buildJournalVideoConstraints();
    expect(c.video).toMatchObject({
      facingMode: "user",
      aspectRatio: { ideal: 9 / 16 },
      width: { ideal: 720, max: 720 },
      height: { ideal: 1280, max: 1280 },
    });
    expect(c.audio).toBe(true);
  });

  it("uses landscape dimensions on a landscape iPhone", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      maxTouchPoints: 5,
    });
    vi.stubGlobal("window", { innerWidth: 844, innerHeight: 390 });
    const c = buildJournalVideoConstraints();
    expect(c.video).toMatchObject({
      facingMode: "user",
      aspectRatio: { ideal: 16 / 9 },
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
    });
  });

  it("uses default webcam constraints on desktop", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      maxTouchPoints: 0,
    });
    vi.stubGlobal("window", { innerWidth: 1440, innerHeight: 900 });
    const c = buildJournalVideoConstraints();
    expect(c.video).toMatchObject({
      aspectRatio: { ideal: 16 / 9 },
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
    });
    expect(c.video).not.toHaveProperty("facingMode");
    expect(c.audio).toBe(true);
  });

  it("uses 1080p when requested", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      maxTouchPoints: 0,
    });
    vi.stubGlobal("window", { innerWidth: 1440, innerHeight: 900 });
    const c = buildJournalVideoConstraints({ quality: "1080p" });
    expect(c.video).toMatchObject({
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
    });
  });
});

describe("tuneJournalVideoStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the acquired iPhone stream aligned with portrait capture dimensions", async () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      maxTouchPoints: 5,
    });
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844 });
    const applyConstraints = vi.fn().mockResolvedValue(undefined);
    const stream = {
      getVideoTracks: () => [{ applyConstraints }],
    } as unknown as MediaStream;

    await tuneJournalVideoStream(stream);

    expect(applyConstraints).toHaveBeenCalledWith({
      aspectRatio: { ideal: 9 / 16 },
      width: { max: 720 },
      height: { max: 1280 },
      frameRate: { max: 30 },
    });
  });
});

describe("createJournalAudioSidecarRecorder", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "MediaStream",
      class {
        constructor(public tracks: MediaStreamTrack[]) {}
      },
    );
    vi.stubGlobal("MediaRecorder", class {
      static isTypeSupported(type: string) {
        return type.startsWith("audio/");
      }
      constructor(_stream: MediaStream, public options?: { mimeType?: string }) {}
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a sidecar recorder when audio tracks exist", () => {
    const track = { kind: "audio" } as MediaStreamTrack;
    const stream = { getAudioTracks: () => [track] } as MediaStream;
    const sidecar = createJournalAudioSidecarRecorder(stream);
    expect(sidecar?.mimeType).toBe("audio/webm;codecs=opus");
  });
});

describe("journalVideoTranscriptEmptyMessage", () => {
  it("surfaces server STT errors when present", () => {
    expect(
      journalVideoTranscriptEmptyMessage({
        sttError: "ElevenLabs API key missing or invalid on server",
        hadLiveCaption: false,
        hadAudioSidecar: true,
      }),
    ).toContain("ElevenLabs");
  });
});
