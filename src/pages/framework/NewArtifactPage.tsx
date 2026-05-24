import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Mic, Radio, Square, Upload, Youtube, FileText, FileUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { toast } from "@/hooks/use-toast";
import {
  countTimedTranscriptLines,
  looksLikeYoutubeShowTranscriptPaste,
  normalizePastedTranscript,
} from "@/lib/normalizePastedTranscript";
import { getYouTubeEmbedUrl, getYouTubeVideoId } from "@/lib/youtube";

const ONE_MB = 1024 * 1024;

function friendlyImportFnError(functionName: string, err: unknown): string {
  const msg = err == null ? "" : typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : String(err);
  if (/not found|404|Failed to fetch|FunctionsHttpError|ERR_NETWORK/i.test(msg)) {
    return `${functionName} is unavailable. Apply pending Supabase migrations (artifact-uploads bucket), deploy the import edge functions, and try again. (${msg})`;
  }
  if (/Bucket not found|bucket|Storage/i.test(msg)) {
    return `Storage is not set up for imports. Run migrations to create the artifact-uploads bucket, then try again. (${msg})`;
  }
  return msg;
}

type Mode = "text" | "youtube" | "live" | "voice" | "import";

export default function NewArtifactPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>("youtube");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [youtubePaste, setYoutubePaste] = useState("");
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [busy, setBusy] = useState(false);
  const createProcessingToken = () => crypto.randomUUID();

  useEffect(() => {
    const requestedMode = params.get("mode");
    if (
      requestedMode === "youtube" ||
      requestedMode === "text" ||
      requestedMode === "live" ||
      requestedMode === "voice" ||
      requestedMode === "import"
    ) {
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

  const normalizedYoutubePastePreview = useMemo(
    () => (youtubePaste.trim() ? normalizePastedTranscript(youtubePaste) : ""),
    [youtubePaste],
  );
  const youtubePasteTimestampsNormalized =
    youtubePaste.trim().length > 0 && normalizedYoutubePastePreview !== youtubePaste.trim();

  const applyYoutubePasteNormalization = useCallback((raw: string) => {
    const normalized = normalizePastedTranscript(raw);
    if (normalized !== raw.trim()) {
      setYoutubePaste(normalized);
      toast({
        title: "Transcript timestamps normalized",
        description: `${countTimedTranscriptLines(normalized)} timed lines in [M:SS] format.`,
      });
    }
    return normalized;
  }, []);

  const handleYoutubePasteInput = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const chunk = e.clipboardData.getData("text/plain");
    if (!chunk || !looksLikeYoutubeShowTranscriptPaste(chunk)) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? youtubePaste.length;
    const end = el.selectionEnd ?? youtubePaste.length;
    const merged = youtubePaste.slice(0, start) + chunk + youtubePaste.slice(end);
    applyYoutubePasteNormalization(merged);
  };

  const youTubeVideoId = useMemo(() => getYouTubeVideoId(url), [url]);
  const embedUrl = useMemo(() => getYouTubeEmbedUrl(url), [url]);
  const showPreviewSlot = url.trim().length > 0;

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const submitText = async () => {
    if (!text.trim()) {
      toast({ title: "Paste the transcript or text first", variant: "destructive" });
      return;
    }
    setBusy(true);
    const processingToken = createProcessingToken();
    const { data, error } = await supabase
      .from("artifacts")
      .insert({
        user_id: user.id,
        title: title.trim() || null,
        kind: "text",
        url: url.trim() || null,
        raw_text: normalizePastedTranscript(text),
        status: "analyzing",
        processing_token: processingToken,
      })
      .select("id")
      .maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast({ title: "Failed", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }
    supabase.functions.invoke("framework-analyze", { body: { artifact_id: data.id, processing_token: processingToken } }).catch((e) => {
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
    const processingToken = createProcessingToken();
    const { data, error } = await supabase.from("artifacts").insert({
      user_id: user.id,
      title: title.trim() || null,
      kind: "youtube",
      url: url.trim(),
      raw_text: "",
      status: "fetching",
      processing_token: processingToken,
    }).select("id").maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast({ title: "Failed", description: error?.message, variant: "destructive" });
      return;
    }
    supabase.functions.invoke("framework-fetch-transcript", {
      body: { artifact_id: data.id, url: url.trim(), processing_token: processingToken },
    }).catch((e) => console.error(e));
    navigate(`/framework/artifacts/${data.id}`);
  };

  const submitYoutubeWithPaste = async () => {
    if (!youtubePaste.trim()) {
      toast({ title: "Paste the transcript first", variant: "destructive" });
      return;
    }
    if (!url.trim()) {
      toast({ title: "Add a YouTube URL for context", description: "The URL links chapters and the video player.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const processingToken = createProcessingToken();
    const { data, error } = await supabase.from("artifacts").insert({
      user_id: user.id,
      title: title.trim() || null,
      kind: "youtube",
      url: url.trim(),
      raw_text: normalizePastedTranscript(youtubePaste),
      status: "analyzing",
      processing_token: processingToken,
      metadata: { source: "youtube", import_via: "paste" },
    }).select("id").maybeSingle();
    if (error || !data) {
      setBusy(false);
      toast({ title: "Failed", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }
    supabase.functions.invoke("framework-analyze", {
      body: { artifact_id: data.id, processing_token: processingToken },
    }).catch((e) => console.error(e));
    navigate(`/framework/artifacts/${data.id}`);
  };

  const uploadToArtifactBucket = async (file: File, ext: string) => {
    const path = `${user.id}/${crypto.randomUUID()}${ext}`;
    const { error: upErr } = await supabase.storage.from("artifact-uploads").upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (upErr) throw new Error(upErr.message);
    return path;
  };

  const invokeImport = async <T,>(name: string, body: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) throw new Error(friendlyImportFnError(name, error));
    if (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string") {
      throw new Error((data as { error: string }).error);
    }
    return data as T;
  };

  const submitChatGptExport = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".json") && !lower.endsWith(".zip")) {
      toast({ title: "Unsupported file", description: "Use conversations.json or a .zip export from ChatGPT.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const processingToken = createProcessingToken();
    try {
      const ext = lower.endsWith(".zip") ? ".zip" : ".json";
      toast({ title: "Uploading export…", description: file.name });
      const path = await uploadToArtifactBucket(file, ext);
      toast({ title: "Importing conversations…", description: "This can take a minute for large exports." });
      const res = await invokeImport<{
        ok?: boolean;
        first_artifact_id?: string;
        imported?: number;
        partial?: boolean;
        message?: string | null;
      }>("import-chatgpt-export", { storage_path: path, processing_token: processingToken });
      if (!res?.ok) throw new Error("Import did not complete");
      const n = res.imported ?? 0;
      toast({
        title: "Import started",
        description: res.partial && res.message ? res.message : `Queued analysis for ${n} conversation${n === 1 ? "" : "s"}.`,
      });
      if (res.first_artifact_id) navigate(`/framework/artifacts/${res.first_artifact_id}`);
      else navigate("/framework/artifacts");
    } catch (e) {
      toast({ title: "ChatGPT import failed", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submitPdfImport = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "PDF only", description: "Choose a .pdf file.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const processingToken = createProcessingToken();
    try {
      toast({ title: "Uploading PDF…", description: file.name });
      const path = await uploadToArtifactBucket(file, ".pdf");
      toast({ title: "Extracting text…", description: "Starting analysis when ready." });
      const res = await invokeImport<{ ok?: boolean; artifact_id?: string }>("import-pdf", {
        storage_path: path,
        processing_token: processingToken,
        original_filename: file.name,
      });
      if (!res?.ok || !res.artifact_id) throw new Error("Import did not complete");
      toast({ title: "PDF imported", description: "Analysis running in the background." });
      navigate(`/framework/artifacts/${res.artifact_id}`);
    } catch (e) {
      toast({ title: "PDF import failed", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submitTextFileImport = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".txt") && !lower.endsWith(".md")) {
      toast({ title: "Unsupported file", description: "Use .txt or .md.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const processingToken = createProcessingToken();
    try {
      if (file.size <= ONE_MB) {
        const raw = await file.text();
        if (!raw.trim()) {
          toast({ title: "Empty file", variant: "destructive" });
          return;
        }
        const { data, error } = await supabase
          .from("artifacts")
          .insert({
            user_id: user.id,
            title: file.name.replace(/\.(txt|md)$/i, "").slice(0, 500) || null,
            kind: "text_file",
            url: null,
            raw_text: raw.trim(),
            status: "analyzing",
            processing_token: processingToken,
            metadata: { source: "text_file", original_filename: file.name, import_via: "browser" },
          })
          .select("id")
          .maybeSingle();
        if (error || !data) throw new Error(error?.message ?? "Insert failed");
        supabase.functions
          .invoke("framework-analyze", { body: { artifact_id: data.id, processing_token: processingToken } })
          .catch((err) => console.error(err));
        toast({ title: "Text imported", description: "Analysis running in the background." });
        navigate(`/framework/artifacts/${data.id}`);
        return;
      }

      toast({ title: "Uploading large file…", description: file.name });
      const ext = lower.endsWith(".md") ? ".md" : ".txt";
      const path = await uploadToArtifactBucket(file, ext);
      toast({ title: "Reading file…", description: "Starting analysis when ready." });
      const res = await invokeImport<{ ok?: boolean; artifact_id?: string }>("import-text-file", {
        storage_path: path,
        processing_token: processingToken,
        original_filename: file.name,
      });
      if (!res?.ok || !res.artifact_id) throw new Error("Import did not complete");
      toast({ title: "Text imported", description: "Analysis running in the background." });
      navigate(`/framework/artifacts/${res.artifact_id}`);
    } catch (e) {
      toast({ title: "Text import failed", description: String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
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
    const processingToken = createProcessingToken();
    const { data, error } = await supabase.from("artifacts").insert({
      user_id: user.id,
      title: title.trim() || `Voice memo ${new Date().toLocaleDateString()}`,
      kind: "voice",
      raw_text: "",
      status: "transcribing",
      processing_token: processingToken,
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
      body: { artifact_id: data.id, storage_path: path, processing_token: processingToken },
    }).catch((e) => console.error(e));
    navigate(`/framework/artifacts/${data.id}`);
  };

  const tabs: { id: Mode; label: string; icon: LucideIcon }[] = [
    { id: "youtube", label: "YouTube", icon: Youtube },
    { id: "live", label: "Live", icon: Radio },
    { id: "text", label: "Text", icon: FileText },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "import", label: "Import", icon: FileUp },
  ];

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

      {mode !== "import" && (
        <>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" className="mb-4" />
        </>
      )}

      {mode === "text" && (
        <>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Source URL (optional)</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="mb-4" />
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Content</label>
          <PolishedTextarea
            polishResetKey="artifact-text"
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
          {showPreviewSlot && (
            <div className="mb-4 rounded-lg overflow-hidden border border-border bg-card aspect-video">
              {embedUrl ? (
                <iframe
                  key={youTubeVideoId ?? embedUrl}
                  title="YouTube preview"
                  src={embedUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                  Could not read a video ID from that URL. Paste the full link (e.g. https://youtu.be/… or youtube.com/watch?v=…).
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mb-4">
            Fetches captions when available. If fetch fails or you already have the transcript, paste it below.
          </p>
          <Button onClick={submitYoutube} disabled={busy} className="mb-6">
            {busy ? "Fetching…" : "Fetch & analyze"}
          </Button>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium mb-1">Or paste full transcript</p>
            <p className="text-xs text-muted-foreground mb-3">
              YouTube → ⋮ → Show transcript, select all and copy. Timestamps optional.
            </p>
            <Textarea
              value={youtubePaste}
              onChange={(e) => setYoutubePaste(e.target.value)}
              onPaste={handleYoutubePasteInput}
              rows={12}
              placeholder={"[0:00] Opening…\n[0:15] Next line…"}
              className="font-mono text-sm mb-2"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground tabular-nums mb-3">
              {youtubePaste.length.toLocaleString()} characters
              {youtubePasteTimestampsNormalized ? (
                <span className="text-foreground">
                  {" "}
                  · Timestamps will normalize to [M:SS] ({countTimedTranscriptLines(normalizedYoutubePastePreview)} lines)
                </span>
              ) : null}
            </p>
            <Button variant="secondary" onClick={submitYoutubeWithPaste} disabled={busy || !youtubePaste.trim()}>
              {busy ? "Saving…" : "Save & analyze pasted transcript"}
            </Button>
          </div>
        </>
      )}

      {mode === "live" && (
        <div className="rounded-2xl border border-border/70 bg-card/45 p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-red-700">
            <Radio className="h-5 w-5" aria-hidden />
            <span className="font-medium">Live stream capture</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Embed, transcribe, and lift claims live.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Open the live workspace to paste a YouTube livestream, feed transcript chunks, detect claim candidates, and
            save the capture back into your artifact library.
          </p>
          <Button asChild className="mt-5">
            <Link to="/framework/live">Open live workspace</Link>
          </Button>
        </div>
      )}

      {mode === "import" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Upload files to private storage, then edge functions create artifacts and run the same analyzer as other sources.
            Files over 1&nbsp;MB for text use a small server import — deploy{" "}
            <code className="text-xs bg-muted px-1 rounded">import-text-file</code> with the bucket migration.
          </p>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> ChatGPT export
            </h3>
            <p className="text-xs text-muted-foreground mb-3">conversations.json or the full Data export .zip from ChatGPT.</p>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-primary hover:underline">
              <input
                type="file"
                accept=".json,.zip,application/json,application/zip"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void submitChatGptExport(f);
                }}
              />
              Choose .json or .zip
            </label>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileUp className="w-4 h-4" /> PDF
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Books, papers, or articles as PDF (text extraction).</p>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-primary hover:underline">
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void submitPdfImport(f);
                }}
              />
              Choose PDF
            </label>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Text / Markdown
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              .txt or .md up to 1&nbsp;MB is read in the browser; larger files upload then{" "}
              <code className="text-xs bg-muted px-1 rounded">import-text-file</code>.
            </p>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer text-primary hover:underline">
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void submitTextFileImport(f);
                }}
              />
              Choose .txt or .md
            </label>
          </div>
        </div>
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
