import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildJournalVideoConstraints,
  pickJournalVideoMimeType,
} from "@/lib/journal/videos";

describe("pickJournalVideoMimeType", () => {
  beforeEach(() => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (t: string) => t.startsWith("video/webm"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns first supported webm variant", () => {
    expect(pickJournalVideoMimeType()).toBe("video/webm;codecs=vp9,opus");
  });

  it("returns empty when MediaRecorder missing", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    expect(pickJournalVideoMimeType()).toBe("");
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
    expect(c.video).toMatchObject({ facingMode: "user", width: { ideal: 480, max: 640 } });
    expect(c.audio).toBe(true);
  });

  it("uses default webcam constraints on desktop", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      maxTouchPoints: 0,
    });
    vi.stubGlobal("window", { innerWidth: 1440 });
    const c = buildJournalVideoConstraints();
    expect(c.video).not.toHaveProperty("facingMode");
    expect(c.audio).toBe(true);
  });
});
