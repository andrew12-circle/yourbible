import { useEffect, useRef, useState } from "react";
import { Download, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { downloadJournalVideoBackup } from "@/lib/journal/journalVideoBackup";
import { JOURNAL_VIDEO_RETRY_REQUEST_EVENT, JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT, JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY,
  listQueuedJournalVideoUploads, readQueuedJournalVideoUpload, type QueuedJournalVideoUpload } from "@/lib/journal/journalVideoUploadQueue";
import { JOURNAL_VIDEO_UPLOAD_PROGRESS_EVENT, readJournalVideoUploadProgress, type JournalVideoUploadProgress } from "@/lib/journal/journalVideoUploadProgress";

/** Only pending clips subscribe to transfer state; typing and progress cannot reload the map/player. */
export function JournalVideoTransferStatus({ userId, entryId }: { userId?: string; entryId?: string | null }) {
  const locking = useJournalVaultStore((state) => state.locking);
  const encrypted = useJournalVaultStore((state) => state.e2eEnabled);
  const dek = useJournalVaultStore((state) => state.dek);
  const blocked = locking || (encrypted && !dek);
  const [rows, setRows] = useState<QueuedJournalVideoUpload[]>([]);
  const [progress, setProgress] = useState<Record<string, JournalVideoUploadProgress>>({});
  const [error, setError] = useState<string | null>(null);
  const latest = useRef({ userId, entryId, blocked });
  latest.current = { userId, entryId, blocked };
  useEffect(() => {
    setError(null);
    if (!userId || !entryId || blocked) { setRows([]); setProgress({}); return; }
    const sync = () => {
      const pending = listQueuedJournalVideoUploads(userId).filter((row) => row.entryId === entryId);
      setRows((previous) => JSON.stringify(previous) === JSON.stringify(pending) ? previous : pending);
      setProgress(Object.fromEntries(pending.flatMap((row) => {
        const value = readJournalVideoUploadProgress(row.id);
        return value?.userId === userId ? [[row.id, value]] : [];
      })));
    };
    const storageChanged = (event: StorageEvent) => { if (event.key === JOURNAL_VIDEO_UPLOAD_QUEUE_META_KEY) sync(); };
    const progressed = (event: Event) => {
      const value = (event as CustomEvent<JournalVideoUploadProgress>).detail;
      if (value?.userId === userId && value.entryId === entryId) setProgress((previous) => ({ ...previous, [value.id]: value }));
    };
    sync();
    window.addEventListener(JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT, sync);
    window.addEventListener("storage", storageChanged);
    window.addEventListener(JOURNAL_VIDEO_UPLOAD_PROGRESS_EVENT, progressed);
    return () => {
      window.removeEventListener(JOURNAL_VIDEO_UPLOAD_QUEUE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener(JOURNAL_VIDEO_UPLOAD_PROGRESS_EVENT, progressed);
    };
  }, [userId, entryId, blocked]);
  const download = async (row: QueuedJournalVideoUpload) => {
    setError(null);
    try {
      const payload = await readQueuedJournalVideoUpload(row.id);
      if (latest.current.userId !== row.userId || latest.current.entryId !== row.entryId || latest.current.blocked) return;
      if (!payload?.video.size) throw new Error("The local copy is no longer available. Open the uploaded video instead.");
      downloadJournalVideoBackup(payload.video, row.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't download this backup."); }
  };
  if (!userId || !entryId || blocked) return null;
  const currentRows = rows.filter((row) => row.userId === userId && row.entryId === entryId);
  if (!currentRows.length) return null;
  return <section className="my-3 space-y-2" aria-label="Video transfers">
    {currentRows.map((row) => {
      const value = progress[row.id];
      const percent = value ? Math.max(0, Math.min(100, Math.floor(value.loaded / Math.max(1, value.total) * 100))) : null;
      const paused = row.stage === "failed" || row.stage === "deferred-transcription";
      const uploaded = Boolean(row.videoId && row.storagePath);
      const label = row.stage === "queued" || !row.stage ? "Video kept on this device. Waiting to upload."
        : paused ? uploaded ? "Video uploaded. Transcript waiting to retry." : "Upload paused. Your recording is still on this device."
        : uploaded ? "Video uploaded. Finishing transcript." : row.stage === "uploading" ? `Uploading video${percent == null ? "…" : ` · ${percent}%`}` : "Preparing your video…";
      return <div key={row.id} className="rounded-xl border border-border/60 bg-muted/20 p-3" data-video-transfer={row.id}>
        <p className="text-sm text-muted-foreground">{label}</p>
        {row.stage === "uploading" && percent != null ? <progress className="mt-2 h-1.5 w-full" aria-label="Video upload progress" value={percent} max={100} /> : null}
        <div className="mt-1 flex flex-wrap gap-1">
          <Button type="button" variant="ghost" className="min-h-11 gap-1.5 px-2 text-xs" onClick={() => void download(row)}><Download className="h-3.5 w-3.5" />Download backup</Button>
          {paused ? <Button type="button" variant="ghost" className="min-h-11 gap-1.5 px-2 text-xs" onClick={() => window.dispatchEvent(new CustomEvent(JOURNAL_VIDEO_RETRY_REQUEST_EVENT, { detail: { id: row.id, userId, entryId } }))}><RotateCw className="h-3.5 w-3.5" />Retry now</Button> : null}
        </div>
      </div>;
    })}
    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
  </section>;
}
