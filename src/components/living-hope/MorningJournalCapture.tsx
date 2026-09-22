import { flushMorningInlineJournals } from "./MorningFormulaInlineJournal";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { useJournalEntryVideos } from "@/hooks/useJournalEntryVideos";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
import JournalVideoCaptureDialog from "@/components/journal/JournalVideoCaptureDialog";
import JournalEntryVideos from "@/components/journal/JournalEntryVideos";
import { JournalVideoTransferStatus } from "@/components/journal/JournalVideoTransferStatus";
import { JournalAiPrivacy, JournalAiDocument } from "@/components/journal/JournalAiPrivacy";
import { journalCloudAiAllowed } from "@/lib/journal/journalAiPolicy";
import { refreshJournalDocument } from "@/lib/journal/journalDocuments";
import { saveJournalVideoCaptureWithQueue } from "@/lib/journal/journalVideoUploadProcessor";
import { journalVideoCaptureSupported } from "@/lib/journal/videos";
import { MORNING_CONVERSATION_LISTENING_HEADING } from "@/lib/livingHope/morningConversationJournal";
import { lh } from "@/lib/livingHope/themeClasses";

export function MorningJournalCapture({ entryId }: { entryId: string }) {
  const { user, profile } = useAuth();
  const locking = useJournalVaultStore((s) => s.locking);
  const [capture, setCapture] = useState<{ owner: string; body: string; anchor: number; allowAi: boolean } | null>(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localClip, setLocalClip] = useState<{ url: string; transcript: string } | null>(null);
  const canOpen = Boolean(user && profile?.user_id === user.id && !profile?.journal_e2e_enabled && !locking);
  useEffect(() => { if (!canOpen) { setCapture(null); setLocalClip(null); } }, [canOpen]);
  const identity = `${user?.id}:${entryId}`;
  const latest = useRef({ identity, canOpen }); latest.current = { identity, canOpen };
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => () => { if (localClip) URL.revokeObjectURL(localClip.url); }, [localClip]);
  const media = useJournalEntryVideos(canOpen ? entryId : null);

  const open = async () => {
    if (!user || !canOpen || opening) return;
    setOpening(true); setError(null);
    try {
      // Load the existing shared document before recording: privacy and safe transcript
      // placement must use its authoritative metadata, not an assumed blank entry.
      await flushMorningInlineJournals(user.id, entryId);
      const row = await refreshJournalDocument(user.id, entryId);
      if (!alive.current || latest.current.identity !== identity || !latest.current.canOpen) return;
      if (row.e2e_encrypted || row.contentLocked) throw new Error("Open and unlock this private entry in the full journal.");
      const body = String(row.body ?? "");
      const listening = body.indexOf(MORNING_CONVERSATION_LISTENING_HEADING);
      setCapture({ owner: identity, body, anchor: listening < 0 ? body.length : listening, allowAi: journalCloudAiAllowed(row) });
    } catch (cause) { if (alive.current && latest.current.identity === identity) setError(cause instanceof Error ? cause.message : "Couldn't open the recorder."); }
    finally { if (alive.current && latest.current.identity === identity) setOpening(false); }
  };
  const complete = async (result: JournalVideoCaptureResult, durationMs: number) => {
    if (!user || !capture || capture.owner !== identity || latest.current.identity !== identity || !latest.current.canOpen) throw new Error("Journal access changed. Your recording has not been attached to another entry.");
    setSaving(true); setError(null);
    try {
      await saveJournalVideoCaptureWithQueue({ userId: user.id, entryId, result, durationMs,
        anchorOffset: capture.anchor, bodySnap: { body: capture.body, anchor: capture.anchor }, deferUpload: true });
      if (!alive.current || latest.current.identity !== identity || !latest.current.canOpen) return;
      setLocalClip({ url: URL.createObjectURL(result.video), transcript: capture.allowAi ? result.peakLiveTranscript || result.liveTranscript : "" });
      setCapture(null);
      void media.reload();
    } catch (cause) {
      if (alive.current && latest.current.identity === identity) setError(cause instanceof Error ? cause.message : "Couldn't save this recording. It is still in the recorder.");
      throw cause;
    } finally { if (alive.current && latest.current.identity === identity) setSaving(false); }
  };

  return <div className="space-y-5">
    <div className="rounded-2xl bg-muted/40 px-5 py-8 text-center sm:py-10">
      <Video className="mx-auto mb-4 h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="mb-5 font-serif text-2xl">What's on your heart?</p>
      <Button type="button" className={`${lh.btnPrimary} sm:w-auto px-6`} disabled={!canOpen || opening || !journalVideoCaptureSupported()} onClick={() => void open()}>
        {opening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Video className="mr-2 h-5 w-5" aria-hidden />}Record my video journal
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">Your camera opens here. Press Record when you are ready.</p>
      {!canOpen && <p className="mt-3 text-sm">Open the full journal to unlock private writing.</p>}
      {!journalVideoCaptureSupported() && <p className="mt-3 text-sm">Video capture is unavailable in this browser. You can still write below.</p>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {canOpen && localClip && <details open className="space-y-3"><summary className="min-h-11 cursor-pointer py-3 text-sm">Review your latest recording · local copy</summary>
      <video src={localClip.url} controls playsInline preload="metadata" className="max-h-[420px] w-full rounded-2xl bg-black" />
      {localClip.transcript && <p className="text-base leading-relaxed">{localClip.transcript}</p>}
      <p className="text-sm text-muted-foreground">The transfer status below shows whether upload has finished. This preview alone does not confirm cloud storage.</p>
    </details>}
    <JournalVideoTransferStatus userId={canOpen ? user?.id : undefined} entryId={entryId} />
    {canOpen && <JournalEntryVideos videos={media.videos} />}
    {media.error && <div role="alert" className="text-sm"><p>{media.error}</p><Button variant="ghost" onClick={() => void media.reload()}>Refresh recordings</Button></div>}
    <Link className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4" to={`/journal/${entryId}`}>Open full journal · audio, photos & sketch</Link>
    {canOpen && capture?.owner === identity && user && <JournalAiPrivacy.Provider value={capture.allowAi}><JournalAiDocument.Provider value={entryId}>
      <JournalVideoCaptureDialog open onOpenChange={(next) => { if (!next && !saving) setCapture(null); }} onComplete={complete} uploading={saving}
        allowTranscription={capture.allowAi} defaultMode="camera" forceInline reviewBeforeUpload
        recovery={{ userId: user.id, entryId, anchorOffset: capture.anchor }}
        nativeCaptureContext={{ userId: user.id, entryId, anchorOffset: capture.anchor }}
        confirmLabel="Keep in today's journal" reviewHint="Your recording stays with this morning. Upload status appears after saving." />
    </JournalAiDocument.Provider></JournalAiPrivacy.Provider>}
  </div>;
}
