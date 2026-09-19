import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { JournalVideoTransferStatus } from "./JournalVideoTransferStatus";
import { downloadJournalVideoBackup } from "@/lib/journal/journalVideoBackup";
import { formatJournalVideoClock } from "@/lib/journal/journalVideoLimits";
import {
  JOURNAL_VIDEO_RECOVERY_CHANGED_EVENT, JOURNAL_VIDEO_RECOVERY_META_KEY,
  isJournalVideoRecordingActiveInPage, isJournalVideoRecordingRecoveryClaimable,
  listInProgressJournalVideoRecordings, readInProgressJournalVideoRecording,
  type JournalVideoRecordingRecoveryMeta,
} from "@/lib/journal/journalVideoRecordingRecovery";
import { JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT, listQueuedJournalVideoUploads } from "@/lib/journal/journalVideoUploadQueue";
import {
  listPendingNativeJournalVideoCaptures, nativeJournalVideoRecoveryHref,
  NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT, type NativeJournalVideoCaptureSnapshot,
} from "@/lib/native/journalVideoNative";

/** A stable entry point; subscribes only inside the open dialog, not in the editor/map. */
export function JournalPendingRecordings({ userId, compact = false }: { userId?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const locking = useJournalVaultStore((state) => state.locking);
  const encrypted = useJournalVaultStore((state) => state.e2eEnabled);
  const dek = useJournalVaultStore((state) => state.dek);
  const blocked = locking || (encrypted && !dek);
  // Hide immediately on account/vault changes, including any mounted video metadata.
  const [owner, setOwner] = useState(userId);
  useEffect(() => { setOpen(false); setOwner(userId); }, [userId, blocked]);
  if (!userId) return null;
  return <>
    <Button type="button" variant="ghost" className={compact ? "h-11 w-11 p-0 text-inherit" : "min-h-11 w-full justify-start gap-2"}
      disabled={blocked} aria-label="Pending recordings" onClick={() => setOpen(true)}>
      <Video className="h-4 w-4" />{compact ? null : "Pending recordings"}
    </Button>
    <Dialog open={open && owner === userId && !blocked} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pending recordings</DialogTitle>
          <DialogDescription>Uploads and interrupted recordings from all your entries on this device. Other devices may have their own pending recordings.</DialogDescription>
        </DialogHeader>
        {open && owner === userId && !blocked ? <PendingRecordingContents key={userId} userId={userId} /> : null}
      </DialogContent>
    </Dialog>
  </>;
}

function PendingRecordingContents({ userId }: { userId: string }) {
  const [recoveries, setRecoveries] = useState<JournalVideoRecordingRecoveryMeta[]>([]);
  const [native, setNative] = useState<NativeJournalVideoCaptureSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    let generation = 0;
    const sync = () => {
      const request = ++generation;
      const queued = new Set(listQueuedJournalVideoUploads(userId).map((row) => row.id));
      setRecoveries(listInProgressJournalVideoRecordings().filter((row) => row.userId === userId && !queued.has(row.id)
        && !isJournalVideoRecordingActiveInPage(row.id)
        && (row.ownershipReleasedAt || isJournalVideoRecordingRecoveryClaimable(row))));
      void listPendingNativeJournalVideoCaptures().then((rows) => {
        if (active.current && generation === request) setNative(rows.filter((row) => row.userId === userId && !queued.has(row.sessionId)));
      }).catch(() => { if (active.current && generation === request) setError("Native recordings could not be checked. Their source files have not been changed."); });
    };
    const storage = (event: StorageEvent) => { if (event.key === JOURNAL_VIDEO_RECOVERY_META_KEY) sync(); };
    sync();
    // A crashed recorder's lease can become stale without emitting an event.
    const timer = window.setInterval(sync, 5000);
    window.addEventListener("storage", storage);
    window.addEventListener(JOURNAL_VIDEO_RECOVERY_CHANGED_EVENT, sync);
    window.addEventListener(JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT, sync);
    window.addEventListener(NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT, sync);
    return () => {
      active.current = false; generation++; window.clearInterval(timer);
      window.removeEventListener("storage", storage);
      window.removeEventListener(JOURNAL_VIDEO_RECOVERY_CHANGED_EVENT, sync);
      window.removeEventListener(JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT, sync);
      window.removeEventListener(NATIVE_JOURNAL_VIDEO_PENDING_CHANGED_EVENT, sync);
    };
  }, [userId]);
  const download = async (row: JournalVideoRecordingRecoveryMeta) => {
    setError(null);
    try {
      const payload = await readInProgressJournalVideoRecording(row.id);
      const vault = useJournalVaultStore.getState();
      if (!active.current || vault.locking || (vault.e2eEnabled && !vault.dek)) return;
      if (!payload || payload.meta.userId !== userId) throw new Error("The recovery source is no longer available.");
      downloadJournalVideoBackup(payload.video, `${row.finalizationIncomplete ? "incomplete-" : ""}${row.id}`);
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : "The recovery source has been kept."); }
  };
  return <div className="space-y-4">
    <JournalVideoTransferStatus userId={userId} allEntries />
    {recoveries.length || native.length ? <h3 className="font-medium">Interrupted recordings and drafts</h3> : null}
    {recoveries.map((row) => <div key={row.id} className="rounded-xl border p-3">
      <p className="text-sm font-medium">{new Date(row.startedAt).toLocaleString()} · {formatJournalVideoClock(row.durationMs)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{row.finalizationIncomplete
        ? "Recording did not finish. The recovered part is retained, may be incomplete, and has not been automatically uploaded."
        : "Recovery is waiting to finish. Its source is retained on this device."}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => void download(row)}><Download className="h-4 w-4" />{row.finalizationIncomplete ? "Download recovered part" : "Download backup"}</Button>
        <Link className="inline-flex min-h-11 items-center text-sm underline" to={`/journal/${encodeURIComponent(row.entryId)}/edit`}>Open entry</Link>
      </div>
    </div>)}
    {native.map((row) => {
      const href = nativeJournalVideoRecoveryHref(row, userId);
      return <div key={row.sessionId} className="rounded-xl border p-3">
        <p className="text-sm font-medium">iPhone draft · {formatJournalVideoClock(row.durationMs ?? 0)}</p>
        <p className="text-sm text-muted-foreground">Kept in the native recorder. Open it to review and decide whether to save.</p>
        {href ? <Link className="inline-flex min-h-11 items-center text-sm underline" to={href}>Review draft</Link> : null}
      </div>;
    })}
    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
  </div>;
}
