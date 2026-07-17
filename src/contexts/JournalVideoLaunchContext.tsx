import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import JournalVideoCaptureDialog from "@/components/journal/JournalVideoCaptureDialog";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";

export type JournalVideoLaunchRequest = {
  /** Shown as a teleprompter line while recording. */
  teleprompter?: string;
  defaultMode?: "camera" | "screen";
  /** Show retake / confirm with native video playback before onComplete. */
  reviewBeforeUpload?: boolean;
  /** Keep recorder in the main dialog (not floating) — avoids stacked modal issues. */
  forceInline?: boolean;
  /** Crash-recovery identity — enables transcript/video salvage after reload. */
  recovery?: {
    userId: string;
    entryId: string;
    anchorOffset: number;
  };
  /** Called when recording stops and review begins — before the user taps confirm. */
  onReviewReady?: (result: JournalVideoCaptureResult, durationMs: number) => void;
  /** Override confirm button on the review step. */
  confirmLabel?: string;
  /** Extra hint on the review step. */
  reviewHint?: string;
  onComplete?: (result: JournalVideoCaptureResult, durationMs: number) => void | Promise<void>;
  onRecordingStart?: () => void;
  onLiveTranscript?: (text: string) => void;
};

type JournalVideoLaunchContextValue = {
  launch: (request: JournalVideoLaunchRequest) => void;
  close: () => void;
  isOpen: boolean;
};

const JournalVideoLaunchContext = createContext<JournalVideoLaunchContextValue | null>(null);

export function JournalVideoLaunchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<JournalVideoLaunchRequest | null>(null);

  const launch = useCallback((next: JournalVideoLaunchRequest) => {
    setRequest(next);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setRequest(null);
  }, []);

  const value = useMemo(() => ({ launch, close, isOpen: open }), [launch, close, open]);

  return (
    <JournalVideoLaunchContext.Provider value={value}>
      {children}
      {open && request ? (
        <JournalVideoCaptureDialog
          open={open}
          onOpenChange={(v) => {
            if (!v) close();
          }}
          defaultMode={request.defaultMode ?? "camera"}
          teleprompter={request.teleprompter}
          forceInline={request.forceInline ?? true}
          stackElevated
          onRecordingStart={request.onRecordingStart}
          onLiveTranscript={request.onLiveTranscript}
          recovery={request.recovery}
          onReviewReady={request.onReviewReady}
          confirmLabel={request.confirmLabel}
          reviewHint={request.reviewHint}
          onComplete={async (result, durationMs) => {
            await request.onComplete?.(result, durationMs);
            close();
          }}
          reviewBeforeUpload={request.reviewBeforeUpload ?? true}
        />
      ) : null}
    </JournalVideoLaunchContext.Provider>
  );
}

export function useJournalVideoLaunch(): JournalVideoLaunchContextValue {
  const ctx = useContext(JournalVideoLaunchContext);
  if (!ctx) {
    throw new Error("useJournalVideoLaunch must be used within JournalVideoLaunchProvider");
  }
  return ctx;
}
