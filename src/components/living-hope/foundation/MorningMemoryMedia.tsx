import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { pickJournalAudioMimeType } from "@/lib/journal/videos";
import type { MorningMemory } from "@/lib/livingHope/morningFoundation";

type MediaKind = "photo" | "audio";
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "video/webm"]);
const MAX_BYTES = { photo: 10 * 1024 * 1024, audio: 30 * 1024 * 1024 };
const bucketFor = (kind: MediaKind) => kind === "photo" ? "journal-photos" : "voice-memos";

export function validateMemoryMedia(kind: MediaKind, file: Blob): void {
  const mime = file.type.split(";")[0].toLowerCase();
  if (!(kind === "photo" ? PHOTO_TYPES : AUDIO_TYPES).has(mime)) {
    throw new Error(kind === "photo" ? "Choose a JPEG, PNG, WebP, or GIF photo." : "Choose an MP3, M4A, WAV, WebM, or Ogg recording.");
  }
  if (!file.size || file.size > MAX_BYTES[kind]) throw new Error(kind === "photo" ? "Choose a photo under 10 MB." : "Choose a recording under 30 MB.");
}

function usePrivateMedia(path: string, kind: MediaKind) {
  const { user } = useAuth();
  const ownerId = user?.id;
  const [result, setResult] = useState({ key: "", url: "", error: "" });
  const [retry, setRetry] = useState(0);
  const key = `${ownerId ?? ""}:${kind}:${path}`;
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!path || !ownerId) return;
      if (!path.startsWith(`${ownerId}/`)) {
        setResult({ key, url: "", error: "This media is not available in this account." });
        return;
      }
      try {
        const { data, error } = await supabase.storage.from(bucketFor(kind)).createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) throw error ?? new Error("Could not open this media.");
        if (alive) setResult({ key, url: data.signedUrl, error: "" });
      } catch (cause) {
        if (alive) setResult({ key, url: "", error: cause instanceof Error ? cause.message : "Could not open this media." });
      }
    };
    if (!path || !ownerId) return () => { alive = false; };
    void load();
    const timer = window.setInterval(() => void load(), 50 * 60 * 1000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [ownerId, path, kind, key, retry]);
  return { url: result.key === key ? result.url : "", error: result.key === key ? result.error : "", retry: () => setRetry((value) => value + 1), fail: () => setResult({ key, url: "", error: "This media could not be displayed. Retry when ready." }) };
}

export function MorningMemoryPreview({ memory, compact = false }: { memory: MorningMemory; compact?: boolean }) {
  const photo = usePrivateMedia(memory.photoPath, "photo");
  const audio = usePrivateMedia(compact ? "" : memory.audioPath, "audio");
  return <div className="space-y-3">
    {photo.url && <img src={photo.url} alt={memory.title} className={compact ? "aspect-[4/3] w-full rounded-xl object-cover" : "max-h-72 w-full rounded-xl object-contain"} loading="lazy" onError={photo.fail} />}
    {!compact && audio.url && <audio aria-label={`Memory recording: ${memory.title}`} controls preload="metadata" src={audio.url} className="w-full max-w-full" />}
    {[photo, audio].filter((media) => media.error).map((media, index) => <p key={index} role="alert" className="text-sm text-destructive">{media.error} <button type="button" className="min-h-11 underline" onClick={media.retry}>Retry media</button></p>)}
  </div>;
}

export function MorningMemoryMedia({ memory, onChange, onBusyChange }: {
  memory: MorningMemory;
  onChange: (patch: Partial<MorningMemory>) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { user, profile } = useAuth();
  const photoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const activeOwner = useRef(user?.id);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const onBusyRef = useRef(onBusyChange);
  const onChangeRef = useRef(onChange);
  onBusyRef.current = onBusyChange; onChangeRef.current = onChange; activeOwner.current = user?.id;
  const allowed = Boolean(user && profile && profile.user_id === user.id && !profile.journal_e2e_enabled);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (stopTimer.current) clearTimeout(stopTimer.current);
      const active = recorder.current;
      if (active) { active.onstop = null; active.ondataavailable = null; if (active.state !== "inactive") active.stop(); }
      stream.current?.getTracks().forEach((track) => track.stop());
      onBusyRef.current(false);
    };
  }, []);

  const release = () => {
    lock.current = false;
    if (mounted.current) { setBusy(false); setRecording(false); onBusyRef.current(false); }
  };
  const upload = async (kind: MediaKind, file: Blob, owner: string) => {
    validateMemoryMedia(kind, file);
    if (!/^[A-Za-z0-9_-]+$/.test(memory.id)) throw new Error("This memory has an invalid ID.");
    const ext: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg" };
    const path = `${owner}/morning-memories/${memory.id}/${crypto.randomUUID()}.${ext[file.type.split(";")[0]] ?? "webm"}`;
    const { error: uploadError } = await supabase.storage.from(bucketFor(kind)).upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;
    if (mounted.current && activeOwner.current === owner) onChangeRef.current(kind === "photo" ? { photoPath: path } : { audioPath: path });
  };
  const chooseFile = async (kind: MediaKind, file: File | undefined) => {
    if (!file || !user || !allowed || lock.current) return;
    lock.current = true; setBusy(true); setError(""); onBusyRef.current(true);
    try { await upload(kind, file, user.id); }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not upload media. Your memory text is still here."); }
    finally { release(); }
  };
  const start = async () => {
    if (!user || !allowed || lock.current) return;
    const owner = user.id;
    lock.current = true; setBusy(true); setError(""); onBusyRef.current(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Recording is unavailable in this browser. Upload an audio file instead.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!mounted.current || activeOwner.current !== owner) { media.getTracks().forEach((track) => track.stop()); release(); return; }
      stream.current = media;
      const mime = pickJournalAudioMimeType();
      const active = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      const chunks: Blob[] = [];
      active.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      active.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (stopTimer.current) clearTimeout(stopTimer.current);
        if (!mounted.current || activeOwner.current !== owner) { release(); return; }
        setRecording(false);
        void upload("audio", new Blob(chunks, { type: active.mimeType || "audio/webm" }), owner)
          .catch((cause) => { if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not save recording."); })
          .finally(release);
      };
      recorder.current = active;
      active.start(1000); setRecording(true);
      stopTimer.current = setTimeout(() => { if (active.state !== "inactive") active.stop(); }, 5 * 60 * 1000);
    } catch (cause) {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Microphone could not start.");
      release();
    }
  };
  return <section className="space-y-3" aria-label="Memory photo and voice">
    <MorningMemoryPreview memory={memory} />
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="min-h-11" disabled={!allowed || busy} onClick={() => photoInput.current?.click()}><Upload className="mr-2 h-4 w-4" />{memory.photoPath ? "Replace photo" : "Add photo"}</Button>
      <Button type="button" variant="outline" className="min-h-11" disabled={!allowed || busy} onClick={() => audioInput.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload voice recording</Button>
      {recording ? <Button type="button" variant="destructive" className="min-h-11" onClick={() => { if (recorder.current?.state === "recording") recorder.current.stop(); }}><Square className="mr-2 h-4 w-4" />Stop recording</Button> : <Button type="button" variant="outline" className="min-h-11" disabled={!allowed || busy} onClick={() => void start()}><Mic className="mr-2 h-4 w-4" />Record this memory</Button>}
    </div>
    <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" aria-label="Upload memory photo" disabled={!allowed || busy} onChange={(event) => { void chooseFile("photo", event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={audioInput} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,audio/ogg" className="sr-only" aria-label="Upload memory voice recording" disabled={!allowed || busy} onChange={(event) => { void chooseFile("audio", event.target.files?.[0]); event.target.value = ""; }} />
    {recording && <p role="status" className="text-sm">Recording your memory. Stops after five minutes.</p>}
    {busy && !recording && <p role="status" className="text-sm">Saving media…</p>}
    {profile?.journal_e2e_enabled && <p className="text-sm text-muted-foreground">Encrypted-journal mode is on. Add media through your encrypted journal instead.</p>}
    <p className="text-xs text-muted-foreground">Media stays in your account's private storage. No transcription or generated testimony. Removing a memory does not delete media from earlier morning snapshots.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
