import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildJournalVideoConstraints,
  createJournalAudioSidecarRecorder,
  journalVideoTranscriptEmptyMessage,
  pickJournalAudioMimeType,
  pickJournalVideoMimeType,
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

  it("returns empty when MediaRecorder missing", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    expect(pickJournalVideoMimeType()).toBe("");
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
