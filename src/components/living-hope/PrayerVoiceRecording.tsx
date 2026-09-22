import { useEffect, useRef, useState } from "react";
import { Mic, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { pickJournalAudioMimeType } from "@/lib/journal/videos";

type Props = {
  prayerKey: "surrender" | "covering";
  storagePath?: string;
  onStoragePathChange: (path: string) => void;
};

function extensionFor(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

export function PrayerVoiceRecording({ prayerKey, storagePath, onStoragePathChange }: Props) {
  const { user } = useAuth();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    const load = async () => {
      if (!storagePath) { setAudioUrl(""); return; }
      const { data, error: downloadError } = await supabase.storage.from("voice-memos").download(storagePath);
      if (cancelled || downloadError || !data) return;
      objectUrl = URL.createObjectURL(data);
      setAudioUrl(objectUrl);
    };
    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storagePath]);

  useEffect(() => () => {
    recorder.current?.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const start = async () => {
    if (!user || busy || recording) return;
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.current = media;
      const mime = pickJournalAudioMimeType();
      const next = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      chunks.current = [];
      next.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      next.onstop = async () => {
        setRecording(false);
        setBusy(true);
        media.getTracks().forEach((track) => track.stop());
        try {
          const blob = new Blob(chunks.current, { type: next.mimeType || "audio/webm" });
          if (!blob.size) throw new Error("No audio was captured.");
          const ext = extensionFor(blob.type);
          const path = `${user.id}/living-hope/${prayerKey}-prayer.${ext}`;
          if (storagePath && storagePath !== path) {
            await supabase.storage.from("voice-memos").remove([storagePath]).catch(() => undefined);
          }
          const { error: uploadError } = await supabase.storage.from("voice-memos").upload(path, blob, {
            upsert: true,
            contentType: blob.type || "audio/webm",
          });
          if (uploadError) throw uploadError;
          onStoragePathChange(path);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not save recording.");
        } finally {
          setBusy(false);
        }
      };
      recorder.current = next;
      next.start(1000);
      setRecording(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Microphone could not start.");
    }
  };

  const stop = () => {
    const active = recorder.current;
    if (active && active.state !== "inactive") active.stop();
  };

  const remove = async () => {
    if (!storagePath || busy) return;
    setBusy(true);
    const { error: removeError } = await supabase.storage.from("voice-memos").remove([storagePath]);
    setBusy(false);
    if (removeError) { setError(removeError.message); return; }
    onStoragePathChange("");
    setAudioUrl("");
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button type="button" variant="outline" className="min-h-11" disabled={busy || !user} onClick={() => void start()}>
            <Mic className="mr-2 h-4 w-4" />{storagePath ? "Record again" : "Record my prayer"}
          </Button>
        ) : (
          <Button type="button" variant="destructive" className="min-h-11" onClick={stop}>
            <Square className="mr-2 h-4 w-4" />Stop recording
          </Button>
        )}
        {storagePath && !recording ? (
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11" disabled={busy} onClick={() => void remove()} aria-label="Delete prayer recording">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {recording ? <p className="text-sm text-muted-foreground">Recording your voice… pray at your normal pace, then tap Stop.</p> : null}
      {audioUrl ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium"><Play className="h-4 w-4" />Listen to my recording</p>
          <audio controls preload="metadata" className="w-full" src={audioUrl} />
        </div>
      ) : storagePath && !busy ? <p className="text-sm text-muted-foreground">Loading your recording…</p> : null}
      {busy ? <p className="text-sm text-muted-foreground">Saving recording…</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
