import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JournalVideoAudioCheckOverlay } from "./JournalVideoAudioCheckOverlay";
import { JournalVideoCaptureReview } from "./JournalVideoCaptureReview";
import { JournalVideoCaptureToolbar } from "./JournalVideoCaptureToolbar";
import type {
  JournalVideoCaptureResult,
  UseJournalVideoCaptureApi,
} from "@/hooks/useJournalVideoCapture";

vi.mock("@/components/journal/JournalVideoLiveMicWaveform", () => ({
  JournalVideoLiveMicWaveform: () => <div data-testid="mic-waveform" />,
}));

vi.mock("@/lib/journal/journalVideoDevices", () => ({
  listAudioInputDevices: vi.fn(() => new Promise<MediaDeviceInfo[]>(() => {})),
  listVideoInputDevices: vi.fn(() => new Promise<MediaDeviceInfo[]>(() => {})),
}));

vi.mock("@/lib/journal/journalVideoThumbnail", () => ({
  captureVideoThumbnail: vi.fn(() => new Promise<string | null>(() => {})),
}));

const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:journal-video-review"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalCreateObjectUrl) {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
  } else {
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
  }
  if (originalRevokeObjectUrl) {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
  } else {
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  }
});

function mobileCameraCapture(
  phase: "preview" | "recording",
): UseJournalVideoCaptureApi {
  return {
    phase,
    mode: "camera",
    previewStream: null,
    deviceId: null,
    audioDeviceId: null,
    countdown: null,
    settings: { quality: "720p" },
    markChapter: vi.fn(),
    patchSettings: vi.fn(),
    selectAudioDevice: vi.fn(),
    selectDevice: vi.fn(),
    setBubbleLayout: vi.fn(),
    skipCountdown: vi.fn(),
    switchFacing: vi.fn(),
  } as unknown as UseJournalVideoCaptureApi;
}

describe("mobile journal video layouts", () => {
  it("keeps 44px Pause and Stop controls outside the secondary-controls scroller", () => {
    const capture = mobileCameraCapture("recording");
    const { container } = render(
      <JournalVideoCaptureToolbar
        capture={capture}
        isMobile
        videoRef={createRef<HTMLVideoElement>()}
        active
        onPauseResume={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    const toolbar = container.firstElementChild as HTMLElement;
    const secondaryControls = toolbar.firstElementChild as HTMLElement;
    const pause = screen.getByRole("button", { name: "Pause recording" });
    const stop = screen.getByRole("button", { name: "Stop recording" });

    expect(toolbar).toHaveClass("overflow-hidden");
    expect(secondaryControls).toHaveClass("min-w-0", "overflow-x-auto");
    expect(pause).toHaveClass("h-11", "w-11");
    expect(stop).toHaveClass("h-11", "w-11");
    expect(secondaryControls).not.toContainElement(pause);
    expect(secondaryControls).not.toContainElement(stop);
  });

  it("keeps review content scrollable with sticky, touch-sized actions", () => {
    const result: JournalVideoCaptureResult = {
      video: new Blob(["video"], { type: "video/mp4" }),
      audio: null,
      liveTranscript: "",
      peakLiveTranscript: "",
      chapters: [],
      durationMs: 5_000,
    };
    const { container } = render(
      <JournalVideoCaptureReview
        result={result}
        durationMs={result.durationMs}
        onRetake={vi.fn()}
        onConfirm={vi.fn()}
        saveError="Couldn't save this video yet."
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    const save = screen.getByRole("button", { name: "Save video" });
    const retake = screen.getByRole("button", { name: "Retake" });
    const actions = save.parentElement?.parentElement as HTMLElement;

    expect(root).toHaveClass("max-h-[100dvh]", "overflow-hidden");
    expect(root.querySelector(".overflow-y-auto")).toBeInTheDocument();
    expect(actions).toHaveClass("sticky", "bottom-0", "shrink-0");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your recording is still here. Tap Save video to retry.",
    );
    expect(save).toHaveClass("min-h-11");
    expect(retake).toHaveClass("min-h-11");

    const video = container.querySelector("video") as HTMLVideoElement;
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 720 },
      videoHeight: { configurable: true, value: 1280 },
    });
    fireEvent.loadedMetadata(video);

    const frame = screen.getByTestId("video-review-frame");
    expect(frame).toHaveClass("h-[min(56dvh,32rem)]", "w-auto", "max-w-full");
    expect(frame).not.toHaveClass("w-full");
    expect(frame.style.aspectRatio).toContain(String(9 / 16));
  });

  it("lets the audio check scroll in short landscape and keeps its actions touch-sized", () => {
    const capture = mobileCameraCapture("preview");
    const { container } = render(
      <JournalVideoAudioCheckOverlay capture={capture} isMobile onContinue={vi.fn()} />,
    );

    const root = container.firstElementChild as HTMLElement;
    const contentViewport = root.firstElementChild as HTMLElement;

    expect(root).toHaveClass("overflow-y-auto", "overscroll-contain");
    expect(contentViewport).toHaveClass("min-h-full");
    expect(screen.getByRole("button", { name: "Flip camera" })).toHaveClass("h-11");
    expect(screen.getByRole("button", { name: "Detecting microphones…" })).toHaveClass("h-11");
    expect(screen.getByRole("button", { name: "Looks good — continue" })).toHaveClass("min-h-11");
  });
});
