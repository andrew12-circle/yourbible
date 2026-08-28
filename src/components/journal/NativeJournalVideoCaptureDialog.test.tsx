import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nativeMocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  buildResult: vi.fn(),
  createSessionId: vi.fn(),
  discard: vi.fn(),
  findPending: vi.fn(),
  readBlob: vi.fn(),
  resume: vi.fn(),
  start: vi.fn(),
  waitReady: vi.fn(),
}));

const appMocks = vi.hoisted(() => ({
  addListener: vi.fn(),
  listeners: new Set<(state: { isActive: boolean }) => void>(),
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: (...args: unknown[]) => appMocks.addListener(...args),
  },
}));

vi.mock("@/lib/native/journalVideoNative", () => ({
  acknowledgeNativeJournalVideoQueued: (...args: unknown[]) => nativeMocks.acknowledge(...args),
  buildNativeJournalVideoCaptureResult: (...args: unknown[]) => nativeMocks.buildResult(...args),
  createNativeJournalVideoSessionId: () => nativeMocks.createSessionId(),
  discardNativeJournalVideoCapture: (...args: unknown[]) => nativeMocks.discard(...args),
  findPendingNativeJournalVideoCapture: (...args: unknown[]) => nativeMocks.findPending(...args),
  readNativeJournalVideoBlob: (...args: unknown[]) => nativeMocks.readBlob(...args),
  resumeNativeJournalVideoCapture: (...args: unknown[]) => nativeMocks.resume(...args),
  startNativeJournalVideoCapture: (...args: unknown[]) => nativeMocks.start(...args),
  waitForNativeJournalVideoCaptureReady: (...args: unknown[]) => nativeMocks.waitReady(...args),
  NativeJournalVideoCaptureCancelledError: class extends Error {},
}));

vi.mock("@/components/journal/JournalVideoCaptureReview", () => ({
  JournalVideoCaptureReview: ({
    onConfirm,
    onRetake,
    saveError,
  }: {
    onConfirm: () => void;
    onRetake: () => void;
    saveError?: string | null;
  }) => (
    <div data-testid="native-review">
      <button type="button" onClick={onConfirm}>
        Confirm native video
      </button>
      <button type="button" onClick={onRetake}>
        Retake native video
      </button>
      {saveError ? <p role="alert">{saveError}</p> : null}
    </div>
  ),
}));

import { NativeJournalVideoCaptureDialog } from "@/components/journal/NativeJournalVideoCaptureDialog";
import type { JournalVideoCaptureResult } from "@/lib/journal/journalVideoCaptureLifecycle";
import type { NativeJournalVideoCaptureSnapshot } from "@/lib/native/journalVideoNative";

const preview: NativeJournalVideoCaptureSnapshot = {
  sessionId: "session-1",
  state: "preview",
  userId: "user-1",
  entryId: "entry-1",
  durationMs: 0,
  byteSize: 0,
};

const ready: NativeJournalVideoCaptureSnapshot = {
  ...preview,
  state: "pendingHandoff",
  fileUrl: "file:///session-1.mp4",
  mimeType: "video/mp4",
  durationMs: 8_000,
  byteSize: 8_000,
};

const video = new Blob(["native-video"], { type: "video/mp4" });

function resultFor(capture: NativeJournalVideoCaptureSnapshot): JournalVideoCaptureResult {
  return {
    video,
    audio: null,
    liveTranscript: "",
    peakLiveTranscript: "",
    chapters: [],
    durationMs: capture.durationMs ?? 0,
    recoveryDraftId: capture.sessionId,
    nativeCaptureId: capture.sessionId,
  };
}

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof NativeJournalVideoCaptureDialog>> = {},
) {
  const props: React.ComponentProps<typeof NativeJournalVideoCaptureDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    onComplete: vi.fn().mockResolvedValue(undefined),
    defaultMode: "camera",
    recovery: { userId: "user-1", entryId: "entry-1", anchorOffset: 7 },
    reviewBeforeUpload: true,
    ...overrides,
  };
  return { ...render(<NativeJournalVideoCaptureDialog {...props} />), props };
}

beforeEach(() => {
  for (const mock of Object.values(nativeMocks)) mock.mockReset();
  appMocks.listeners.clear();
  appMocks.addListener.mockReset();
  appMocks.addListener.mockImplementation(
    async (_event: string, listener: (state: { isActive: boolean }) => void) => {
      appMocks.listeners.add(listener);
      return {
        remove: vi.fn(async () => {
          appMocks.listeners.delete(listener);
        }),
      };
    },
  );
  nativeMocks.createSessionId.mockReturnValue("session-1");
  nativeMocks.findPending.mockResolvedValue(null);
  nativeMocks.start.mockResolvedValue(preview);
  nativeMocks.waitReady.mockImplementation(async (_sessionId, options) => {
    options?.onUpdate?.({ ...preview, state: "recording" });
    options?.onUpdate?.(ready);
    return ready;
  });
  nativeMocks.readBlob.mockResolvedValue(video);
  nativeMocks.buildResult.mockImplementation((capture) => resultFor(capture));
  nativeMocks.acknowledge.mockResolvedValue(undefined);
  nativeMocks.discard.mockResolvedValue(undefined);
  nativeMocks.resume.mockResolvedValue({ ...preview, state: "recording" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NativeJournalVideoCaptureDialog", () => {
  it("starts one owner-scoped session, fires recording start on recording state, and reviews it", async () => {
    const onRecordingStart = vi.fn();
    renderDialog({ onRecordingStart });

    expect(await screen.findByTestId("native-review")).toBeInTheDocument();
    expect(nativeMocks.start).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        userId: "user-1",
        entryId: "entry-1",
        anchorOffset: 7,
        teleprompter: "",
      }),
    );
    expect(onRecordingStart).toHaveBeenCalledOnce();
    expect(nativeMocks.readBlob).toHaveBeenCalledWith(
      ready,
      expect.any(Function),
      expect.any(AbortSignal),
    );
  });

  it("acknowledges the native source only after onComplete durably succeeds", async () => {
    let completeSave: (() => void) | undefined;
    const onComplete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          completeSave = resolve;
        }),
    );
    const onOpenChange = vi.fn();
    renderDialog({ onComplete, onOpenChange });
    await screen.findByTestId("native-review");

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm native video" }));
    });

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ nativeCaptureId: "session-1" }), 8_000);
    expect(nativeMocks.acknowledge).not.toHaveBeenCalled();

    await act(async () => {
      completeSave?.();
    });

    expect(nativeMocks.acknowledge).toHaveBeenCalledWith("session-1");
    expect(onComplete.mock.invocationCallOrder[0]).toBeLessThan(
      nativeMocks.acknowledge.mock.invocationCallOrder[0],
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps review and native source when durable save rejects", async () => {
    const onComplete = vi.fn().mockRejectedValue(new Error("IndexedDB quota exceeded"));
    const onOpenChange = vi.fn();
    renderDialog({ onComplete, onOpenChange });
    await screen.findByTestId("native-review");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm native video" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("IndexedDB quota exceeded");
    expect(nativeMocks.acknowledge).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("retains the source for a deferred Life Week handoff", async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    renderDialog({ onComplete, retainNativeSourceAfterComplete: true });
    await screen.findByTestId("native-review");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm native video" }));
    });

    expect(onComplete).toHaveBeenCalledOnce();
    expect(nativeMocks.acknowledge).not.toHaveBeenCalled();
  });

  it("recovers an exact-owner pending session instead of starting a duplicate", async () => {
    nativeMocks.findPending.mockResolvedValue(ready);
    renderDialog();

    expect(await screen.findByTestId("native-review")).toBeInTheDocument();
    expect(nativeMocks.findPending).toHaveBeenCalledWith({
      userId: "user-1",
      entryId: "entry-1",
    });
    expect(nativeMocks.start).not.toHaveBeenCalled();
  });

  it("re-presents an active owner session after a WebView reload", async () => {
    nativeMocks.findPending.mockResolvedValue({ ...preview, isActiveSession: true });
    renderDialog();

    expect(await screen.findByTestId("native-review")).toBeInTheDocument();
    expect(nativeMocks.resume).toHaveBeenCalledWith("session-1");
    expect(nativeMocks.start).not.toHaveBeenCalled();
  });

  it("reattaches the same native session on foreground without starting another capture", async () => {
    nativeMocks.waitReady.mockImplementation(
      (_sessionId, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    renderDialog();

    await screen.findByText("Recording in the iPhone camera");
    await waitFor(() => expect(appMocks.listeners.size).toBe(1));

    await act(async () => {
      for (const listener of appMocks.listeners) {
        listener({ isActive: false });
        listener({ isActive: true });
      }
    });

    await waitFor(() => expect(nativeMocks.resume).toHaveBeenCalledWith("session-1"));
    expect(nativeMocks.start).toHaveBeenCalledTimes(1);
  });

  it("closes an interrupted wait without acknowledging or discarding the draft", async () => {
    const interrupted = {
      ...preview,
      state: "interrupted" as const,
      canResume: true,
      durationMs: 4_000,
      byteSize: 4_000,
    };
    nativeMocks.waitReady.mockImplementation(
      (_sessionId, options) =>
        new Promise((_resolve, reject) => {
          options?.onUpdate?.(interrupted);
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });
    await screen.findByText("Recording safely paused");

    fireEvent.click(screen.getByRole("button", { name: "Close and keep recording safe" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(nativeMocks.acknowledge).not.toHaveBeenCalled();
    expect(nativeMocks.discard).not.toHaveBeenCalled();
  });

  it("follows a native Keep draft dismissal without polling the hidden recorder forever", async () => {
    nativeMocks.waitReady.mockImplementation(
      (_sessionId, options) =>
        new Promise((_resolve, reject) => {
          options?.onUpdate?.({
            ...preview,
            state: "interrupted",
            canResume: true,
            interruptionReason: "Recording saved as a draft to finish later.",
          });
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(nativeMocks.acknowledge).not.toHaveBeenCalled();
    expect(nativeMocks.discard).not.toHaveBeenCalled();
  });

  it("discards explicitly before starting a retake", async () => {
    nativeMocks.createSessionId
      .mockReturnValueOnce("session-1")
      .mockReturnValueOnce("session-2");
    nativeMocks.start.mockImplementation(async ({ sessionId }) => ({
      ...preview,
      sessionId,
    }));
    nativeMocks.waitReady.mockImplementation(async (sessionId) => ({
      ...ready,
      sessionId,
      fileUrl: `file:///${sessionId}.mp4`,
    }));
    nativeMocks.buildResult.mockImplementation((capture) => resultFor(capture));
    renderDialog();
    await screen.findByTestId("native-review");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retake native video" }));
    });

    await waitFor(() => expect(nativeMocks.start).toHaveBeenCalledTimes(2));
    expect(nativeMocks.discard).toHaveBeenCalledWith("session-1");
    expect(nativeMocks.discard.mock.invocationCallOrder[0]).toBeLessThan(
      nativeMocks.start.mock.invocationCallOrder[1],
    );
  });
});
