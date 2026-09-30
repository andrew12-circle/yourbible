import type { PrayerRecordingKey } from "@/lib/livingHope/workbookTypes";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { pickJournalAudioMimeType } from "@/lib/journal/videos";

type Props = {
  prayerKey: PrayerRecordingKey | "angels";
  storagePath?: string;
  onStoragePathChange: (path: string) => void | Promise<void>;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
};
const extensionFor = (mime: string) => mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";

export function PrayerVoiceRecording({ prayerKey, storagePath, onStoragePathChange, label = "prayer", onBusyChange }: Props) {
  const { user, profile } = useAuth();
  const owner = user?.id;
  const allowed = Boolean(owner && profile?.user_id === owner && !profile.journal_e2e_enabled);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(false);
  const lock = useRef(false);
  const latest = useRef({ owner, onStoragePathChange, onBusyChange });
  latest.current = { owner, onStoragePathChange, onBusyChange };
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playback, setPlayback] = useState({ key: "", url: "" });
  const [pendingPath, setPendingPath] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const key = `${owner ?? ""}:${storagePath ?? ""}`;
  const audioUrl = playback.key === key ? playback.url : "";

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    if (!owner || !storagePath) return;
    if (!storagePath.startsWith(`${owner}/`)) { setError("This recording is not available in this account."); return; }
    setError("");
    void supabase.storage.from("voice-memos").download(storagePath).then(({ data, error: downloadError }) => {
      if (cancelled) return;
      if (downloadError || !data) { setError(downloadError?.message || "Could not open the recording. Try loading it again."); return; }
      objectUrl = URL.createObjectURL(data); setPlayback({ key, url: objectUrl });
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not open recording."); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [owner, storagePath, key, retry]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const active = recorder.current;
      if (active) { active.onstop = null; active.ondataavailable = null; active.onerror = null; if (active.state !== "inactive") active.stop(); }
      stream.current?.getTracks().forEach((track) => track.stop());
      if (timeout.current) clearTimeout(timeout.current);
      latest.current.onBusyChange?.(false);
    };
  }, []);
  const setWorking = (value: boolean) => {
    lock.current = value;
    if (alive.current) { setBusy(value); latest.current.onBusyChange?.(value); }
  };
  const attach = async (path: string, recordingOwner: string) => {
    if (!alive.current || latest.current.owner !== recordingOwner) return;
    await latest.current.onStoragePathChange(path);
    if (alive.current && latest.current.owner === recordingOwner) setPendingPath("");
  };
  const start = async () => {
    if (!owner || !allowed || lock.current) return;
    const recordingOwner = owner;
    setWorking(true); setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Voice recording is unavailable in this browser.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!alive.current || latest.current.owner !== recordingOwner) { media.getTracks().forEach((track) => track.stop()); setWorking(false); return; }
      stream.current = media;
      const mime = pickJournalAudioMimeType();
      const active = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      const chunks: Blob[] = [];
      let interrupted = false;
      active.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      active.onerror = () => { interrupted = true; if (alive.current) setError("Recording was interrupted. Your previous recording has not been replaced."); if (active.state !== "inactive") active.stop(); };
      active.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (timeout.current) clearTimeout(timeout.current);
        if (!alive.current || latest.current.owner !== recordingOwner) { setWorking(false); return; }
        setRecording(false);
        if (interrupted) { setWorking(false); return; }
        void (async () => {
          const blob = new Blob(chunks, { type: active.mimeType || "audio/webm" });
          if (!blob.size || blob.size > 30 * 1024 * 1024) throw new Error("Recording was empty or exceeded 30 MB. Your previous recording is unchanged.");
          // A fresh path keeps the old audio playable until the new pointer saves.
          const path = `${recordingOwner}/living-hope/${prayerKey}/${crypto.randomUUID()}.${extensionFor(blob.type)}`;
          const { error: uploadError } = await supabase.storage.from("voice-memos").upload(path, blob, { upsert: false, contentType: blob.type });
          if (uploadError) throw uploadError;
          if (!alive.current || latest.current.owner !== recordingOwner) return;
          setPendingPath(path);
          await attach(path, recordingOwner);
        })().catch((cause) => { if (alive.current) setError(cause instanceof Error ? cause.message : "Could not save recording. Your previous recording is unchanged."); }).finally(() => setWorking(false));
      };
      recorder.current = active; active.start(1000); setRecording(true);
      timeout.current = setTimeout(() => { if (active.state !== "inactive") active.stop(); }, 10 * 60 * 1000);
    } catch (cause) {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (alive.current) setError(cause instanceof Error ? cause.message : "Microphone could not start.");
      setWorking(false);
    }
  };
  const remove = async () => {
    if (!owner || lock.current || !storagePath) return;
    setWorking(true); setError("");
    try { await attach("", owner); }
    catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Could not remove the recording from this prayer."); }
    finally { setWorking(false); }
  };
  return <section className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3" aria-label={`${label} recording`}>
    <div className="flex flex-wrap items-center gap-2">
      {recording ? <Button type="button" variant="destructive" className="min-h-11" onClick={() => { if (recorder.current?.state === "recording") recorder.current.stop(); }}><Square className="mr-2 h-4 w-4" />Stop recording</Button> : <Button type="button" variant="outline" className="min-h-11" disabled={busy || !allowed} onClick={() => void start()}><Mic className="mr-2 h-4 w-4" />{storagePath ? "Record again" : `Record my ${label}`}</Button>}
      {storagePath && !recording && <Button type="button" variant="ghost" className="h-11 w-11" disabled={busy} onClick={() => void remove()} aria-label={`Remove ${label} recording`}><Trash2 className="h-4 w-4" /></Button>}
      {pendingPath && !busy && <Button type="button" variant="outline" className="min-h-11" onClick={() => { if (!owner) return; setWorking(true); setError(""); void attach(pendingPath, owner).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not attach recording.")).finally(() => setWorking(false)); }}>Retry saving recording</Button>}
    </div>
    {recording && <p role="status" className="text-sm">Recording your voice. Speak at your normal pace, then tap Stop. Ten-minute recording limit.</p>}
    {audioUrl && <audio aria-label={`Listen to my ${label}`} controls preload="metadata" className="w-full max-w-full" src={audioUrl} />}
    {storagePath && !audioUrl && !error && !busy && <p className="text-sm text-muted-foreground">Loading your recording…</p>}
    {busy && !recording && <p role="status" className="text-sm">Saving recording…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {storagePath && !audioUrl && error && <Button type="button" variant="ghost" className="min-h-11" onClick={() => setRetry((value) => value + 1)}>Load recording again</Button>}
    {profile?.journal_e2e_enabled && <p className="text-xs text-muted-foreground">Encrypted-journal mode is on. New recordings are disabled here; use your encrypted journal.</p>}
    <p className="text-xs leading-relaxed text-muted-foreground">Saved privately in your account. No transcription. Removing this attachment does not delete audio referenced by earlier mornings.</p>
  </section>;
}
