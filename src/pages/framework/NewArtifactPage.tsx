import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Mic, Square, Upload, Youtube, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type Mode = "text" | "youtube" | "voice";

export default function NewArtifactPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>("youtube");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requestedMode = params.get("mode");
    if (requestedMode === "youtube" || requestedMode === "text" || requestedMode === "voice") {
      setMode(requestedMode);
    }
  }, [params]);

  useEffect(() => {
    const seedVerse = params.get("verse");
    const seedRef = params.get("ref");
    const template = params.get("template");

    if (template === "question") {
      setMode("text");
      setTitle("Question under examination");
      setText(
        [
          "Question:",
          "",
          "Why this matters to me:",
          "",
          "What I currently think:",
          "",
          "Evidence or sources to examine:",
          "",
          "Tensions / uncertainties:",
          "",
          "Consultation (prayer, counsel, scripture):",
          "",
          "Working conclusion:",
          "",
          "Belief statement I'm ready to commit:",
          "",
        ].join("\n"),
      );
      return;
    }

    if (seedVerse) {
      setMode("text");
      setTitle(seedRef ? `Reflection on ${seedRef}` : "Verse reflection");
      setText(`Scripture under examination: ${seedRef ?? ""}\n"${seedVerse}"\n\nMy thoughts:\n`);
    }
  }, [params]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const submitText = async () => {
    if (!text.trim()) {
      toast({ title: "Paste the transcript or text first", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("artifacts")
      .insert({
        user_id: user.id,
        title: title.trim() || null,
        kind: "text",
        url: url.trim() || null,
        raw_text: text.trim(),
        status: "analyzing",
      })
      .select("id")
      .maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast({ title: "Failed", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }
    supabase.functions.invoke("framework-analyze", { body: { artifact_id: data.id } }).catch((e) => {
      console.error(e);
    });
    navigate(`/framework/artifacts/${data.id}`);
  };

  const submitYoutube = async () => {
    if (!url.trim()) {
      toast({ title: "Paste a YouTube URL", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.from("artifacts").insert({
      user_id: user.id,
      title: title.trim() || null,
      kind: "youtube",
      url: url.trim(),
      raw_text: "",
      status: "fetching",
    }).select("id").maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast({ title: "Failed", description: error?.message, variant: "destructive" });
      return;
    }
    supabase.functions.invoke("framework-fetch-transcript", {
      body: { artifact_id: data.id, url: url.trim() },
    }).catch((e) => console.error(e));
    navigate(`/framework/artifacts/${data.id}`);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const file = new File([blob], `memo-${Date.now()}.webm`, { type: blob.type });
        setAudioFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      toast({ title: "Mic access denied", description: String(e), variant: "destructive" });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const submitVoice = async () => {
    if (!audioFile) {
      toast({ title: "Record or upload audio first", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.from("artifacts").insert({
      user_id: user.id,
      title: title.trim() || `Voice memo ${new Date().toLocaleDateString()}`,
      kind: "voice",
      raw_text: "",
      status: "transcribing",
    }).select("id").maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast({ title: "Failed", description: error?.message, variant: "destructive" });
      return;
    }
    const ext = (audioFile.name.split(".").pop() ?? "webm").toLowerCase();
    const path = `${user.id}/${data.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("voice-memos").upload(path, audioFile, {
      upsert: true, contentType: audioFile.type || "audio/webm",
    });
    if (upErr) {
      setBusy(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    supabase.functions.invoke("framework-transcribe-audio", {
      body: { artifact_id: data.id, storage_path: path },
    }).catch((e) => console.error(e));
    navigate(`/framework/artifacts/${data.id}`);
  };

  const tabs: { id: Mode; label: string; icon: any }[] = [
    { id: "youtube", label: "YouTube", icon: Youtube },
    { id: "text", label: "Text", icon: FileText },
    { id: "voice", label: "Voice", icon: Mic },
  ];

  const getYouTubeEmbed = (input: string) => {
    const value = input.trim();
    if (!value) return null;
    try {
      const parsed = new URL(value);
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.split("/").filter(Boolean)[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.hostname.includes("youtube.com")) {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const embedUrl = getYouTubeEmbed(url);

  return (
    <FrameworkLayout title="New artifact" back="/framework/artifacts">
      <div className="inline-flex rounded-lg border border-border overflow-hidden mb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`px-3 py-2 text-sm inline-flex items-center gap-1.5 ${
                mode === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Title</label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" className="mb-4" />

      {mode === "text" && (
        <>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Source URL (optional)</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="mb-4" />
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Content</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder="Paste a sermon, podcast transcript, lyrics, or journal entry…"
            className="mb-5 font-serif"
          />
          <Button onClick={submitText} disabled={busy}>{busy ? "Submitting…" : "Analyze"}</Button>
        </>
      )}

      {mode === "youtube" && (
        <>
          <div className="rounded-lg border border-red-200/80 bg-red-50/60 p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <Youtube className="w-5 h-5" />
              <span className="font-medium">YouTube capture</span>
            </div>
            <p className="text-xs text-red-700/80">
              Paste a video URL to analyze captions and optionally preview the video here first.
            </p>
          </div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">YouTube URL</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="mb-3" />
          {embedUrl && (
            <div className="mb-4 rounded-lg overflow-hidden border border-border bg-card">
              <iframe
                title="YouTube preview"
                src={embedUrl}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground mb-5">
            Pulls the auto-generated captions and runs them through the analyzer. If captions aren't available you'll be asked to paste the transcript.
          </p>
          <Button onClick={submitYoutube} disabled={busy}>{busy ? "Fetching…" : "Fetch & analyze"}</Button>
        </>
      )}

      {mode === "voice" && (
        <>
          <div className="rounded-lg border border-border bg-card p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              {!recording ? (
                <Button onClick={startRecording} variant="outline" size="sm">
                  <Mic className="w-4 h-4 mr-1" /> Record
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" size="sm">
                  <Square className="w-4 h-4 mr-1" /> Stop
                </Button>
              )}
              <span className="text-xs text-muted-foreground">or</span>
              <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                <Upload className="w-4 h-4" />
                Upload audio
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            {audioFile && (
              <div className="text-xs text-muted-foreground">
                Ready: <span className="text-foreground">{audioFile.name}</span> ({Math.round(audioFile.size / 1024)} KB)
              </div>
            )}
            {recording && (
              <div className="text-xs text-destructive flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" /> Recording…
              </div>
            )}
          </div>
          <Button onClick={submitVoice} disabled={busy || !audioFile}>
            {busy ? "Uploading…" : "Transcribe & analyze"}
          </Button>
        </>
      )}
    </FrameworkLayout>
  );
}