import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildJournalVideoConstraints,
  createJournalAudioSidecarRecorder,
  createJournalVideoMediaRecorder,
  createJournalVideoRecoveryId,
  journalVideoRecorderTimesliceMs,
  journalVideoTranscriptEmptyMessage,
  pickJournalAudioMimeType,
  pickJournalVideoMimeType,
  startJournalMediaRecorder,
} from "@/lib/journal/videos";

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
  it("returns a non-empty id without randomUUID", async () => {
    const { createJournalVideoRecoveryId } = await import("@/lib/journal/videos");
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

  it("uses 1s on Apple devices", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    });
    expect(journalVideoRecorderTimesliceMs()).toBe(1000);
  });

  it("uses 250ms on desktop Chrome UA", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
    });
    expect(journalVideoRecorderTimesliceMs()).toBe(250);
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
  it("uses front camera on iPhone user agents", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      maxTouchPoints: 5,
    });
    vi.stubGlobal("window", { innerWidth: 390 });
    const c = buildJournalVideoConstraints();
    expect(c.video).toMatchObject({
      facingMode: "user",
      aspectRatio: { ideal: 16 / 9 },
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 720 },
    });
    expect(c.audio).toBe(true);
  });

  it("uses default webcam constraints on desktop", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      maxTouchPoints: 0,
    });
    vi.stubGlobal("window", { innerWidth: 1440 });
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
    vi.stubGlobal("window", { innerWidth: 1440 });
    const c = buildJournalVideoConstraints({ quality: "1080p" });
    expect(c.video).toMatchObject({
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
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
