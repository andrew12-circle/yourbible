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
  onComplete?: (result: JournalVideoCaptureResult, durationMs: number) => void | Promise<void>;
  onRecordingStart?: () => void;
  onLiveTranscript?: (text: string) => void;
};

type JournalVideoLaunchContextValue = {
  launch: (request: JournalVideoLaunchRequest) => void;
  close: () => void;
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

  const value = useMemo(() => ({ launch, close }), [launch, close]);

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
          onRecordingStart={request.onRecordingStart}
          onLiveTranscript={request.onLiveTranscript}
          onComplete={async (result, durationMs) => {
            await request.onComplete?.(result, durationMs);
            close();
          }}
          reviewBeforeUpload={false}
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
