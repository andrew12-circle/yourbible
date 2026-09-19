import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JournalVideoCaptureDialog from "./JournalVideoCaptureDialog";
import {
  useJournalVideoCapture,
  type JournalVideoCapturePhase,
  type UseJournalVideoCaptureApi,
} from "@/hooks/useJournalVideoCapture";
import { useIsMobile } from "@/hooks/use-mobile";
import { useJournalVideoAudioCheck } from "@/hooks/useJournalVideoAudioCheck";

vi.mock("@/hooks/useJournalVideoCapture", () => ({
  useJournalVideoCapture: vi.fn(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

vi.mock("@/hooks/useJournalVideoAudioCheck", () => ({
  useJournalVideoAudioCheck: vi.fn(),
}));

vi.mock("@/hooks/useSilenceAutoPause", () => ({
  useSilenceAutoPause: vi.fn(),
}));

vi.mock("@/hooks/useMicLevel", () => ({
  useMicLevel: vi.fn(() => 0),
}));

vi.mock("@/components/journal/JournalVideoCaptureToolbar", () => ({
  JournalVideoCaptureToolbar: () => <div data-testid="capture-toolbar" />,
}));

vi.mock("@/components/journal/JournalVideoAudioCheckOverlay", () => ({
  JournalVideoAudioCheckOverlay: () => <div data-testid="audio-check" className="z-20" />,
}));

vi.mock("@/components/journal/JournalVideoPausedOverlay", () => ({
  JournalVideoPausedOverlay: () => <div data-testid="paused-overlay" className="z-20" />,
}));

vi.mock("@/components/journal/JournalVideoCaptureReview", () => ({
  JournalVideoCaptureReview: ({
    onConfirm,
    saveError,
  }: {
    onConfirm: () => void;
    saveError?: string | null;
  }) => (
    <div data-testid="capture-review">
      <button type="button" onClick={onConfirm}>
        Confirm reviewed video
      </button>
      {saveError ? <div role="alert">{saveError}</div> : null}
    </div>
  ),
}));

vi.mock("@/components/journal/LiveTranscriptTicker", () => ({
  LiveTranscriptTicker: () => null,
}));

vi.mock("@/components/journal/JournalVideoFloatingShell", () => ({
  JournalVideoFloatingShell: ({ children }: { children: React.ReactNode }) => children,
}));

function captureForPhase(phase: JournalVideoCapturePhase): UseJournalVideoCaptureApi {
  return {
    supported: true,
    mode: "camera",
    phase,
    error: null,
    interim: "",
    countdown: null,
    recordingElapsedMs: 5_000,
    recordingBytes: 1_024,
    recordingRemainingMs: 60_000,
    maxDurationMs: 1_800_000,
    previewStream:
      phase === "preview"
        ? ({ getAudioTracks: () => [{}] } as unknown as MediaStream)
        : null,
    facingMode: "user",
    deviceId: null,
    audioDeviceId: null,
    chapters: [],
    settings: {
      quality: "720p",
      countdown: 3,
      floatingRecorder: false,
      silenceAutoPause: false,
    },
    screenUsesCameraAudio: true,
    durableBackupState: "saved",
    durableBackupError: null,
    interruptionReason: phase === "paused" ? "background" : null,
    canResume: phase === "paused",
    openPreview: vi.fn().mockResolvedValue(undefined),
    beginCountdown: vi.fn(),
    cancelCountdown: vi.fn(),
    skipCountdown: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    stopRecording: vi.fn(() => new Promise(() => {})),
    cancel: vi.fn(),
    releaseCapture: vi.fn(),
    bindPreview: vi.fn(),
    markChapter: vi.fn(),
    patchSettings: vi.fn(),
    setBubbleLayout: vi.fn(),
    selectAudioDevice: vi.fn().mockResolvedValue(undefined),
    selectDevice: vi.fn().mockResolvedValue(undefined),
    switchFacing: vi.fn().mockResolvedValue(undefined),
  } as unknown as UseJournalVideoCaptureApi;
}

describe("JournalVideoCaptureDialog mobile dismissal", () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    vi.mocked(useJournalVideoAudioCheck).mockReturnValue({
      passed: true,
      markPassed: vi.fn(),
      reset: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each(["recording", "paused"] as const)(
    "safely stops a %s recording when the visible Close button is tapped",
    (phase) => {
      const capture = captureForPhase(phase);
      vi.mocked(useJournalVideoCapture).mockReturnValue(capture);

      render(
        <JournalVideoCaptureDialog
          open
          stackElevated
          defaultMode="camera"
          onOpenChange={vi.fn()}
          onComplete={vi.fn()}
        />,
      );

      const dialog = screen.getByRole("dialog");
      const close = screen.getByRole("button", { name: "Close" });
      expect(dialog).toHaveClass(
        "inset-0",
        "h-[100dvh]",
        "max-w-none",
        "sm:max-w-none",
        "sm:rounded-none",
      );
      expect(close).toHaveClass("z-30", "h-11", "w-11");
      expect(close.className).toContain("safe-area-inset-right");

      fireEvent.click(close);

      expect(capture.stopRecording).toHaveBeenCalledOnce();
      expect(capture.cancel).not.toHaveBeenCalled();
    },
  );

  it("keeps the touch-sized Close button above audio setup and cancels only the preview", () => {
    const capture = captureForPhase("preview");
    const onOpenChange = vi.fn();
    vi.mocked(useJournalVideoCapture).mockReturnValue(capture);
    vi.mocked(useJournalVideoAudioCheck).mockReturnValue({
      passed: false,
      markPassed: vi.fn(),
      reset: vi.fn(),
    });

    render(
      <JournalVideoCaptureDialog
        open
        stackElevated
        defaultMode="camera"
        onOpenChange={onOpenChange}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByTestId("audio-check")).toHaveClass("z-20");
    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveClass("z-30", "h-11", "w-11");

    fireEvent.click(close);

    expect(capture.stopRecording).not.toHaveBeenCalled();
    expect(capture.cancel).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps an active recording open when safe stop cannot produce a result", async () => {
    const capture = captureForPhase("recording");
    const onOpenChange = vi.fn();
    capture.stopRecording = vi.fn().mockResolvedValue(null);
    vi.mocked(useJournalVideoCapture).mockReturnValue(capture);

    render(
      <JournalVideoCaptureDialog
        open
        stackElevated
        defaultMode="camera"
        onOpenChange={onOpenChange}
        onComplete={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await Promise.resolve();
    });

    expect(capture.stopRecording).toHaveBeenCalledOnce();
    expect(capture.cancel).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("keeps review and its captured Blob available when durable save rejects", async () => {
    const capture = captureForPhase("recording");
    const onOpenChange = vi.fn();
    const result = {
      video: new Blob(["kept"], { type: "video/webm" }),
      audio: null,
      liveTranscript: "kept words",
      peakLiveTranscript: "kept words",
      chapters: [],
      durationMs: 5_000,
      recoveryDraftId: "recovery-1",
    };
    capture.stopRecording = vi.fn().mockResolvedValue(result);
    const onComplete = vi.fn().mockRejectedValue(new Error("Device storage is full."));
    vi.mocked(useJournalVideoCapture).mockReturnValue(capture);

    render(
      <JournalVideoCaptureDialog
        open
        stackElevated
        defaultMode="camera"
        onOpenChange={onOpenChange}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await Promise.resolve();
    });
    expect(screen.getByTestId("capture-review")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm reviewed video" }));
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save this video yet.");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(capture.cancel).not.toHaveBeenCalled();
  });
});


describe("journal recorder non-destructive retry and completion", () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    vi.mocked(useJournalVideoAudioCheck).mockReturnValue({ passed: true, markPassed: vi.fn(), reset: vi.fn() } as never);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  const result = () => ({ video: new Blob(["recording"]), audio: null, liveTranscript: "words", peakLiveTranscript: "words", chapters: [], durationMs: 5000, recoveryDraftId: "take-1" });
  it("explicitly reacquires the camera on retry without calling discard", () => {
    const capture = captureForPhase("idle"); capture.recordingBytes = 0; capture.recordingElapsedMs = 0; capture.durableBackupState = "idle"; capture.error = "Permission was denied";
    vi.mocked(useJournalVideoCapture).mockReturnValue(capture);
    render(<JournalVideoCaptureDialog open stackElevated defaultMode="camera" onOpenChange={vi.fn()} onComplete={vi.fn()} />);
    const initial = vi.mocked(capture.openPreview).mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(capture.openPreview).toHaveBeenCalledTimes(initial + 1);
    expect(capture.cancel).not.toHaveBeenCalled();
  });
  it("routes browser Stop sharing through the visible review", async () => {
    const capture = captureForPhase("recording"); capture.mode = "screen";
    capture.stopRecording = vi.fn().mockResolvedValue(result());
    vi.mocked(useJournalVideoCapture).mockReturnValue(capture);
    render(<JournalVideoCaptureDialog open defaultMode="screen" onOpenChange={vi.fn()} onComplete={vi.fn()} />);
    await act(async () => { vi.mocked(useJournalVideoCapture).mock.calls.at(-1)?.[0]?.onScreenShareEnded?.(); });
    expect(screen.getByTestId("capture-review")).toBeVisible();
    expect(capture.cancel).not.toHaveBeenCalled();
  });
  it("serializes repeated save taps even when the parent supplies no uploading prop", async () => {
    const capture = captureForPhase("recording"); capture.stopRecording = vi.fn().mockResolvedValue(result());
    const complete = vi.fn(() => new Promise<void>(() => {}));
    vi.mocked(useJournalVideoCapture).mockReturnValue(capture);
    render(<JournalVideoCaptureDialog open stackElevated defaultMode="camera" onOpenChange={vi.fn()} onComplete={complete} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close" })));
    const save = screen.getByRole("button", { name: "Confirm reviewed video" });
    fireEvent.click(save); fireEvent.click(save);
    expect(complete).toHaveBeenCalledOnce();
  });
});
