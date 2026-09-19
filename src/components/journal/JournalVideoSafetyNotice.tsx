import { useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UseJournalVideoCaptureApi } from "@/hooks/useJournalVideoCapture";
import type { JournalVideoStorageHealth } from "@/lib/journal/journalVideoStorage";
import { downloadJournalVideoBackup } from "@/lib/journal/journalVideoBackup";

type Props = {
  capture: UseJournalVideoCaptureApi;
  health: JournalVideoStorageHealth | null;
  onStop: () => void;
  onCloseKept: () => void;
  onDiscard: () => void;
  onRecheck: () => void;
};

/** Exceptional states only; successful recording has no saving/saved status chatter. */
export function JournalVideoSafetyNotice({ capture, health, onStop, onCloseKept, onDiscard, onRecheck }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [keeping, setKeeping] = useState(false);
  const finalizing = capture.phase === "processing";
  const active = capture.phase === "recording" || capture.phase === "paused";
  const atRisk = capture.durableBackupState === "at-risk";
  const storageWarning = health?.status === "low" || health?.status === "unavailable";
  const download = () => {
    setActionError(null);
    try {
      const blob = capture.getPartialRecording?.();
      if (!blob) throw new Error("No video bytes are available yet. Keep this recorder open.");
      downloadJournalVideoBackup(blob, "incomplete-recovered-part");
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not download the recovered part."); }
  };
  const keep = async () => {
    if (keeping || !capture.keepUnfinishedRecording) return;
    setKeeping(true); setActionError(null);
    try { await capture.keepUnfinishedRecording(); onCloseKept(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Keep the recorder open and download a backup."); }
    finally { setKeeping(false); }
  };
  if (!finalizing && !atRisk && !storageWarning) return null;
  return <div className={finalizing
    ? "absolute inset-0 z-40 flex flex-col items-center justify-start overflow-y-auto bg-black/95 p-4 text-white"
    : "absolute inset-x-3 top-24 z-30 max-h-[40%] overflow-y-auto rounded-xl border border-amber-400/50 bg-black/90 p-3 text-white"}
    data-video-safety-notice>
    <div className="my-auto w-full max-w-lg space-y-2">
      {finalizing ? <>
        <p className="flex items-center gap-2 font-semibold" role="status"><Loader2 className="h-5 w-5 animate-spin" />Finishing recording</p>
        <p className="text-sm text-white/80">{capture.finalizationDelayed
          ? "The browser is still releasing the final video data. This is not a completed recording yet."
          : "Waiting for the complete video before opening review."}</p>
        {capture.finalizationDelayed ? <>
          <p className="text-sm text-white/80">You can keep waiting, or preserve the recovered part. A partial download may not play completely.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="min-h-11" onClick={download}><Download className="mr-2 h-4 w-4" />Download recovered part</Button>
            {capture.keepUnfinishedRecording ? <Button type="button" variant="secondary" className="min-h-11" disabled={keeping} onClick={() => void keep()}>{keeping ? "Checking recovery…" : "Keep recovery and close"}</Button> : null}
            <Button type="button" variant="ghost" className="min-h-11 text-white" disabled={keeping} onClick={() => {
              if (window.confirm("Discard this unfinished recording? Its local recovery copy will be deleted.")) onDiscard();
            }}>Discard recording</Button>
          </div>
        </> : null}
      </> : <>
        <p className="flex items-center gap-2 font-semibold" role="alert"><AlertTriangle className="h-5 w-5 shrink-0" />{atRisk || health?.status === "unavailable" ? "Local backup needs attention" : "Device storage is running low"}</p>
        <p className="text-sm text-white/90">{atRisk
          ? "The local backup could not be confirmed. Keep this window open and stop to save or download your recording."
          : health?.status === "unavailable"
            ? "This browser could not store a test recording. Free space or allow site storage before starting a valuable take."
            : "The estimated free space may not fit a long recording and its save copy. Upload pending videos or free space first."}</p>
        {health?.persistent === false ? <p className="text-xs text-white/70">Persistent storage has not been granted. Upload or download pending recordings before clearing browser data.</p> : null}
        {health && health.pendingCount > 0 ? <p className="text-xs text-white/70">{health.pendingCount} recording(s) are already waiting on this device. The estimate includes their storage.</p> : null}
        <div className="flex flex-wrap gap-2">
          {active ? <Button type="button" variant="secondary" className="min-h-11" onClick={onStop}>Stop and preserve recording</Button>
            : <Button type="button" variant="secondary" className="min-h-11" onClick={onRecheck}>Recheck storage</Button>}
          {active && capture.getPartialRecording ? <Button type="button" variant="secondary" className="min-h-11" onClick={download}>Download recovered part</Button> : null}
        </div>
      </>}
      {actionError ? <p className="text-sm text-amber-200" role="alert">{actionError}</p> : null}
    </div>
  </div>;
}
