import { DictateButton } from "@/components/journal/DictateButton";
import { JournalAiPrivacy } from "@/components/journal/JournalAiPrivacy";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ExternalLink, FileAudio, Image, Link2, Loader2, Pause, Pencil, Play, Plus, Trash2, Upload, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrl } from "@/lib/journal/photos";
import { getOrCreateSceneNarration } from "@/lib/livingHope/sceneNarration";
import type { WorkbookStory } from "@/lib/livingHope/workbookTypes";
import { newId } from "@/lib/livingHope/workbookTypes";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

const ACE_SCENE_URL =
  "https://chatgpt.com/g/g-p-6868a9d4590481918f3bfd31e01c3abe-god/c/6ab3ed65-d60c-83ea-a731-279c06afe97c";
const ACE_STORAGE_KEY = "yb_ace_scene_card_v3";

const DEFAULT_ACE_SCENE_TEXT = `It is a weekday morning in Franklin.

I walk into my office just after 8:00. The room is cool, the desk is clear, and soft morning light comes through the windows. I set my coffee beside the keyboard and sit down without anxiety.

Before I touch ACE, I talk to God and thank Him for bringing us through the hard season, for the people we can help, and for the wisdom to steward what has been built.

I open ACE. Everything is moving. Texts have gone out. Replies are organized. Follow-ups are handled. I open my calendar and there are eight appointments before 2:00.

I talk with six people. Three applications come in. Two become real deals.

Nothing feels frantic. I am not chasing people. I am listening, showing borrowers their real numbers, and helping families find breathing room.

ACE keeps the work organized while I focus on the conversation. Robert is helping again. My processor owns the processing side. Another assistant handles the repetitive work. I am not the bottleneck anymore.

By early afternoon, the work is done. I close the laptop.

Actually close it.

The pipeline is moving without me staring at it. The financial hole is shrinking. Bills are being paid. Work no longer feels like the loudest thing in my life.

I walk into the rest of the house. I hear my family. Later I am in the golf simulator, present and peaceful.

There is margin again.

Time for my wife. Time for Lilly. Time for Caroline. Time for Scripture. Time to serve people. Time to build things because I am called to build them, not because fear is driving me.

I look back over the day: six conversations, three applications, two deals.

And it felt easy.

I thank God again for provision, wisdom, peace, and the ability to help people.

Then I leave work where it belongs.

At work.

And I go live my life.`;

type AceSceneSettings = {
  storagePath: string;
  audioStoragePath: string;
  audioFileName: string;
  chatgptUrl: string;
  text: string;
};

type Props = {
  stories: WorkbookStory[];
  suggestedIndex: number;
  selectedIndex: number | null;
  onSelectedIndexChange: (index: number) => void;
  onAddStory: (text: string) => void;
  onUpdateStory?: (index: number, patch: Partial<WorkbookStory>) => void;
  onDeleteStory?: (index: number) => void;
  storyRecall: string;
  onStoryRecallChange: (value: string) => void;
};

async function uploadSceneCover(userId: string, sceneId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp|heic|gif)$/i.test(ext) ? ext : "jpg";
  const path = `${userId}/morning-scenes/${sceneId}-${Date.now()}.${safeExt}`;
  const { error } = await supabase.storage
    .from("journal-photos")
    .upload(path, file, { upsert: false, contentType: file.type || `image/${safeExt}` });
  if (error) throw error;
  return path;
}

async function uploadSceneAudio(userId: string, sceneId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
  const safeExt = /^(mp3|wav|m4a)$/i.test(ext) ? ext : "mp3";
  const path = `${userId}/morning-scenes/manual/${sceneId}-${Date.now()}.${safeExt}`;
  const { error } = await supabase.storage
    .from("voice-memos")
    .upload(path, file, { upsert: false, contentType: file.type || "audio/mpeg" });
  if (error) throw error;
  return path;
}

async function getSceneAudioUrl(storagePath: string): Promise<string> {
  if (!storagePath) return "";
  const { data, error } = await supabase.storage.from("voice-memos").createSignedUrl(storagePath, 3600);
  if (error) return "";
  return data?.signedUrl ?? "";
}

function SceneReader({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <section className={cn(lh.cardFlat, "col-span-full overflow-hidden border-primary/20")}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className={cn(lh.labelUpper, lh.accentMuted)}>Read scene</p>
          <h3 className={cn(lh.titleMd, "mt-1")}>{title}</h3>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close scene">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-[52vh] overflow-y-auto px-5 py-5 sm:px-7">
        <div className="mx-auto max-w-2xl whitespace-pre-wrap text-[16px] leading-8 text-foreground">
          {text}
        </div>
      </div>
    </section>
  );
}

export function MorningStoryPanel({
  stories,
  suggestedIndex,
  selectedIndex,
  onSelectedIndexChange,
  onAddStory,
  onUpdateStory,
  onDeleteStory,
}: Props) {
  const { user, profile } = useAuth();
  const [adding, setAdding] = useState(false);
  const [newStoryText, setNewStoryText] = useState("");
  const [openStory, setOpenStory] = useState<"ace" | number | null>(null);
  const [editingStoryIndex, setEditingStoryIndex] = useState<number | null>(null);
  const [storyDraft, setStoryDraft] = useState({ title: "", text: "", chatgptUrl: "" });
  const [editingAce, setEditingAce] = useState(false);
  const [ace, setAce] = useState<AceSceneSettings>({
    storagePath: "",
    audioStoragePath: "",
    audioFileName: "",
    chatgptUrl: ACE_SCENE_URL,
    text: DEFAULT_ACE_SCENE_TEXT,
  });
  const [aceCoverUrl, setAceCoverUrl] = useState("");
  const [aceAudioUrl, setAceAudioUrl] = useState("");
  const [storyCoverUrls, setStoryCoverUrls] = useState<Record<string, string>>({});
  const [storyAudioUrls, setStoryAudioUrls] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadingAudioKey, setUploadingAudioKey] = useState<string | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [narratingKey, setNarratingKey] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ key: string; title: string; url: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<"ace" | number | null>(null);
  const [audioUploadTarget, setAudioUploadTarget] = useState<"ace" | number | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AceSceneSettings>;
      setAce({
        storagePath: typeof parsed.storagePath === "string" ? parsed.storagePath : "",
        audioStoragePath: typeof parsed.audioStoragePath === "string" ? parsed.audioStoragePath : "",
        audioFileName: typeof parsed.audioFileName === "string" ? parsed.audioFileName : "",
        chatgptUrl: typeof parsed.chatgptUrl === "string" && parsed.chatgptUrl.trim() ? parsed.chatgptUrl : ACE_SCENE_URL,
        text: typeof parsed.text === "string" && parsed.text.trim() ? parsed.text : DEFAULT_ACE_SCENE_TEXT,
      });
    } catch {
      // Keep defaults if local settings are malformed.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ace.storagePath) {
        setAceCoverUrl("");
        return;
      }
      const url = await getSignedPhotoUrl(ace.storagePath, 3600);
      if (!cancelled) setAceCoverUrl(url ?? "");
    })();
    return () => { cancelled = true; };
  }, [ace.storagePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        stories.map(async (story) => {
          if (story.cover_storage_path) {
            const signed = await getSignedPhotoUrl(story.cover_storage_path, 3600);
            return [story.id, signed ?? story.cover_image_url ?? ""] as const;
          }
          return [story.id, story.cover_image_url ?? ""] as const;
        }),
      );
      if (!cancelled) setStoryCoverUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [stories]);

  useEffect(() => {
    let cancelled = false;
    void getSceneAudioUrl(ace.audioStoragePath).then((url) => {
      if (!cancelled) setAceAudioUrl(url);
    });
    return () => { cancelled = true; };
  }, [ace.audioStoragePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        stories.map(async (story) => {
          if (story.narration_storage_path) {
            const signed = await getSceneAudioUrl(story.narration_storage_path);
            return [story.id, signed || story.narration_audio_url || ""] as const;
          }
          return [story.id, story.narration_audio_url || ""] as const;
        }),
      );
      if (!cancelled) setStoryAudioUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [stories]);

  useEffect(() => {
    if (!audio?.url || !audioRef.current) return;
    audioRef.current.load();
    void audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [audio?.url]);

  const saveAce = useCallback((next: AceSceneSettings) => {
    setAce(next);
    window.localStorage.setItem(ACE_STORAGE_KEY, JSON.stringify(next));
    setEditingAce(false);
  }, []);

  const handleAddStory = useCallback(() => {
    const text = newStoryText.trim();
    if (!text) return;
    onAddStory(text);
    setNewStoryText("");
    setAdding(false);
  }, [newStoryText, onAddStory]);

  const startStoryEdit = useCallback((index: number) => {
    const story = stories[index];
    if (!story) return;
    setEditingStoryIndex(index);
    setStoryDraft({
      title: story.title ?? "",
      text: story.text,
      chatgptUrl: story.chatgpt_url ?? "",
    });
  }, [stories]);

  const saveStoryEdit = useCallback(() => {
    if (editingStoryIndex == null || !onUpdateStory) return;
    onUpdateStory(editingStoryIndex, {
      title: storyDraft.title.trim() || undefined,
      text: storyDraft.text.trim(),
      chatgpt_url: storyDraft.chatgptUrl.trim() || undefined,
      narration_provider: "elevenlabs",
    });
    setEditingStoryIndex(null);
  }, [editingStoryIndex, onUpdateStory, storyDraft]);

  const requestCoverUpload = useCallback((target: "ace" | number) => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  }, []);

  const requestAudioUpload = useCallback((target: "ace" | number) => {
    setAudioUploadTarget(target);
    audioFileInputRef.current?.click();
  }, []);

  const handleCoverFile = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    const target = uploadTarget;
    if (!file || target == null || !user?.id) return;
    const key = target === "ace" ? "ace" : stories[target]?.id;
    if (!key) return;
    setUploadingKey(key);
    try {
      const path = await uploadSceneCover(user.id, key, file);
      const signed = await getSignedPhotoUrl(path, 3600);
      if (target === "ace") {
        const next = { ...ace, storagePath: path };
        saveAce(next);
        setAceCoverUrl(signed ?? "");
      } else if (onUpdateStory) {
        onUpdateStory(target, { cover_storage_path: path, cover_image_url: undefined });
        if (signed) setStoryCoverUrls((prev) => ({ ...prev, [key]: signed }));
      }
    } finally {
      setUploadingKey(null);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [ace, onUpdateStory, saveAce, stories, uploadTarget, user?.id]);

  const handleAudioFile = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    const target = audioUploadTarget;
    if (!file || target == null || !user?.id) return;
    const key = target === "ace" ? "ace" : stories[target]?.id;
    if (!key) return;
    setUploadingAudioKey(key);
    setAudioError("");
    try {
      const path = await uploadSceneAudio(user.id, key, file);
      const signed = await getSceneAudioUrl(path);
      if (target === "ace") {
        if (ace.audioStoragePath) {
          await supabase.storage.from("voice-memos").remove([ace.audioStoragePath]).catch(() => undefined);
        }
        const next = { ...ace, audioStoragePath: path, audioFileName: file.name };
        setAce(next);
        window.localStorage.setItem(ACE_STORAGE_KEY, JSON.stringify(next));
        setAceAudioUrl(signed);
      } else if (onUpdateStory) {
        const previous = stories[target]?.narration_storage_path;
        if (previous) await supabase.storage.from("voice-memos").remove([previous]).catch(() => undefined);
        onUpdateStory(target, {
          narration_storage_path: path,
          narration_file_name: file.name,
          narration_audio_url: undefined,
          narration_provider: "elevenlabs",
        });
        setStoryAudioUrls((prev) => ({ ...prev, [key]: signed }));
      }
      if (audio?.key === key) {
        audioRef.current?.pause();
        setAudio(null);
        setPlaying(false);
      }
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "Could not upload recording");
    } finally {
      setUploadingAudioKey(null);
      setAudioUploadTarget(null);
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  }, [ace, audio?.key, audioUploadTarget, onUpdateStory, stories, user?.id]);

  const removeUploadedAudio = useCallback(async (target: "ace" | number) => {
    const key = target === "ace" ? "ace" : stories[target]?.id;
    if (!key) return;
    setUploadingAudioKey(key);
    try {
      if (target === "ace") {
        if (ace.audioStoragePath) await supabase.storage.from("voice-memos").remove([ace.audioStoragePath]);
        const next = { ...ace, audioStoragePath: "", audioFileName: "" };
        setAce(next);
        window.localStorage.setItem(ACE_STORAGE_KEY, JSON.stringify(next));
        setAceAudioUrl("");
      } else if (onUpdateStory) {
        const story = stories[target];
        if (story?.narration_storage_path) await supabase.storage.from("voice-memos").remove([story.narration_storage_path]);
        onUpdateStory(target, {
          narration_storage_path: undefined,
          narration_file_name: undefined,
          narration_audio_url: undefined,
          narration_provider: undefined,
        });
        setStoryAudioUrls((prev) => ({ ...prev, [key]: "" }));
      }
      if (audio?.key === key) {
        audioRef.current?.pause();
        setAudio(null);
        setPlaying(false);
      }
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "Could not remove recording");
    } finally {
      setUploadingAudioKey(null);
    }
  }, [ace, audio?.key, onUpdateStory, stories]);

  const handleDeleteStory = useCallback(async (index: number) => {
    const story = stories[index];
    if (!story || !onDeleteStory) return;
    if (!window.confirm("Delete this scene? This cannot be undone.")) return;
    setDeletingStoryId(story.id);
    try {
      if (story.cover_storage_path) {
        await supabase.storage.from("journal-photos").remove([story.cover_storage_path]).catch(() => undefined);
      }
      if (story.narration_storage_path) {
        await supabase.storage.from("voice-memos").remove([story.narration_storage_path]).catch(() => undefined);
      }
      if (user?.id) {
        const folder = `${user.id}/morning-scenes/audio/${story.id}`;
        const { data: cached } = await supabase.storage.from("voice-memos").list(folder, { limit: 100 });
        if (cached?.length) {
          await supabase.storage.from("voice-memos").remove(cached.map((item) => `${folder}/${item.name}`)).catch(() => undefined);
        }
      }
      if (audio?.key === story.id) {
        audioRef.current?.pause();
        setAudio(null);
        setPlaying(false);
      }
      setOpenStory(null);
      setEditingStoryIndex(null);
      onDeleteStory(index);
    } finally {
      setDeletingStoryId(null);
    }
  }, [audio?.key, onDeleteStory, stories, user?.id]);

  const listenToScene = useCallback(async (key: string, title: string, text: string, uploadedUrl?: string) => {
    setAudioError("");
    if (uploadedUrl) {
      if (audio?.key === key && audio.url === uploadedUrl) {
        const el = audioRef.current;
        if (!el) return;
        if (el.paused) {
          await el.play();
          setPlaying(true);
        } else {
          el.pause();
          setPlaying(false);
        }
      } else {
        setAudio({ key, title, url: uploadedUrl });
      }
      return;
    }

    if (audio?.key === key && audio.url) {
      const el = audioRef.current;
      if (!el) return;
      if (el.paused) {
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
      return;
    }

    if (!text.trim()) return;
    setNarratingKey(key);
    try {
      const result = await getOrCreateSceneNarration({ sceneId: key, text });
      setAudio({ key, title, url: result.audioUrl });
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "Could not create narration");
    } finally {
      setNarratingKey(null);
    }
  }, [audio]);

  const listenLabel = (key: string) => {
    if (narratingKey === key) return "Preparing…";
    if (audio?.key === key && playing) return "Pause";
    if (audio?.key === key) return "Play";
    return "Listen";
  };

  return (
    <div className="flex flex-col gap-4">
      <section>
        <div className="mb-4">
          <h2 className={cn(lh.labelUpper, "mb-1")}>Play a scene</h2>
          <p className={lh.footnote}>Prepare yourself. Read it slowly, or listen with your eyes closed and step into the moment.</p>
        </div>

        {audio ? (
          <div className={cn(lh.cardFlat, "mb-4 flex items-center gap-3 p-3")}>
            <button
              type="button"
              onClick={() => void listenToScene(audio.key, audio.title, "")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-label={playing ? "Pause narration" : "Play narration"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{audio.title}</p>
              <p className={lh.footnote}>ElevenLabs narration · saved and reused</p>
            </div>
            <audio ref={audioRef} src={audio.url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
          </div>
        ) : null}

        {audioError ? <p className="mb-3 text-sm text-destructive">{audioError}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <article className={cn(lh.cardFlat, "overflow-hidden")}>
            <div
              className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-700 to-amber-100 bg-cover bg-center"
              style={aceCoverUrl ? { backgroundImage: `url("${aceCoverUrl}")` } : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
              <button type="button" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60" onClick={() => setEditingAce((v) => !v)} aria-label="Edit ACE scene">
                {editingAce ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Business · provision · margin</p>
                <h3 className="text-lg font-semibold leading-tight">ACE Is Working</h3>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {editingAce ? (
                <div className="space-y-3">
                  <Button type="button" variant="outline" className="w-full gap-2" disabled={uploadingKey === "ace"} onClick={() => requestCoverUpload("ace")}>
                    {uploadingKey === "ace" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {ace.storagePath ? "Replace cover image" : "Upload cover image"}
                  </Button>
                  <MorningVoiceField value={ace.text} onChange={(text) => setAce((v) => ({ ...v, text }))} multiline rows={8} label="Scene text" />
                  <label className={lh.footnote}>Optional ChatGPT reference link</label>
                  <div className="flex items-center gap-2"><Link2 className="h-4 w-4 shrink-0" /><Input value={ace.chatgptUrl} onChange={(e) => setAce((v) => ({ ...v, chatgptUrl: e.target.value }))} placeholder="Paste ChatGPT link" /></div>
                  <div className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex items-center gap-2"><FileAudio className="h-4 w-4" /><p className="text-sm font-semibold">ElevenLabs recording</p></div>
                    {ace.audioStoragePath ? (
                      <>
                        <p className={cn(lh.footnote, "truncate")}>{ace.audioFileName || "Uploaded recording"}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <Button type="button" variant="outline" disabled={!aceAudioUrl} onClick={() => void listenToScene("ace", "ACE Is Working", ace.text, aceAudioUrl)}>Play</Button>
                          <Button type="button" variant="outline" disabled={uploadingAudioKey === "ace"} onClick={() => requestAudioUpload("ace")}>Replace</Button>
                          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={uploadingAudioKey === "ace"} onClick={() => void removeUploadedAudio("ace")}>Remove</Button>
                        </div>
                      </>
                    ) : (
                      <Button type="button" variant="outline" className="w-full gap-2" disabled={uploadingAudioKey === "ace"} onClick={() => requestAudioUpload("ace")}>
                        {uploadingAudioKey === "ace" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload ElevenLabs recording
                      </Button>
                    )}
                  </div>
                  <p className={lh.footnote}>{ace.audioStoragePath ? "Your uploaded recording is used when you press Listen." : "Without an upload, Listen creates and caches an ElevenLabs narration automatically."}</p>
                  <Button type="button" className={cn(lh.btnPrimary, "w-full")} onClick={() => saveAce(ace)}>Save scene</Button>
                </div>
              ) : (
                <>
                  <p className={cn(lh.bodySm, "line-clamp-3 leading-relaxed")}>{ace.text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className={cn(lh.btnSecondary, "gap-2")} onClick={() => setOpenStory(openStory === "ace" ? null : "ace")}>
                      <BookOpen className="h-4 w-4" /> Read scene
                    </Button>
                    <Button type="button" className={cn(lh.btnPrimary, "gap-2")} disabled={narratingKey === "ace"} onClick={() => void listenToScene("ace", "ACE Is Working", ace.text, aceAudioUrl)}>
                      {narratingKey === "ace" ? <Loader2 className="h-4 w-4 animate-spin" /> : audio?.key === "ace" && playing ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {listenLabel("ace")}
                    </Button>
                  </div>
                  {ace.chatgptUrl ? (
                    <a href={ace.chatgptUrl} target="_blank" rel="noopener noreferrer" className={cn(lh.footnote, "flex items-center justify-center gap-1 underline-offset-2 hover:underline")}>
                      Open original ChatGPT scene <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </>
              )}
            </div>
          </article>

          {stories.map((story, index) => {
            const suggested = index === suggestedIndex % Math.max(1, stories.length);
            const editing = editingStoryIndex === index;
            const title = story.title?.trim() || `Scene ${index + 1}`;
            const cover = storyCoverUrls[story.id] || "";
            return (
              <article key={story.id} className={cn(lh.cardFlat, "overflow-hidden")}>
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-muted via-background to-primary/10 bg-cover bg-center" style={cover ? { backgroundImage: `url("${cover}")` } : undefined}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                  {suggested ? <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm">Suggested today</span> : null}
                  <button type="button" className="absolute right-12 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-700/80 text-white backdrop-blur hover:bg-red-700" onClick={() => void handleDeleteStory(index)} aria-label="Delete scene" disabled={deletingStoryId === story.id}>
                    {deletingStoryId === story.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                  <button type="button" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60" onClick={() => editing ? setEditingStoryIndex(null) : startStoryEdit(index)} aria-label="Edit scene">
                    {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  </button>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white"><h3 className="text-base font-semibold leading-tight">{title}</h3></div>
                </div>

                <div className="space-y-3 p-4">
                  {editing ? (
                    <div className="space-y-3">
                      <Input value={storyDraft.title} onChange={(e) => setStoryDraft((v) => ({ ...v, title: e.target.value }))} placeholder="Scene title" />
                      <Button type="button" variant="outline" className="w-full gap-2" disabled={uploadingKey === story.id} onClick={() => requestCoverUpload(index)}>
                        {uploadingKey === story.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                        {story.cover_storage_path || story.cover_image_url ? "Replace cover image" : "Upload cover image"}
                      </Button>
                      <MorningVoiceField value={storyDraft.text} onChange={(text) => setStoryDraft((v) => ({ ...v, text }))} multiline rows={7} label="Scene text" />
                      <div className="flex items-center gap-2"><Link2 className="h-4 w-4 shrink-0" /><Input value={storyDraft.chatgptUrl} onChange={(e) => setStoryDraft((v) => ({ ...v, chatgptUrl: e.target.value }))} placeholder="Optional ChatGPT link" /></div>
                      <div className="rounded-lg border border-border/60 p-3 space-y-2">
                        <div className="flex items-center gap-2"><FileAudio className="h-4 w-4" /><p className="text-sm font-semibold">ElevenLabs recording</p></div>
                        {story.narration_storage_path ? (
                          <>
                            <p className={cn(lh.footnote, "truncate")}>{story.narration_file_name || "Uploaded recording"}</p>
                            <div className="grid grid-cols-3 gap-2">
                              <Button type="button" variant="outline" disabled={!storyAudioUrls[story.id]} onClick={() => void listenToScene(story.id, title, story.text, storyAudioUrls[story.id])}>Play</Button>
                              <Button type="button" variant="outline" disabled={uploadingAudioKey === story.id} onClick={() => requestAudioUpload(index)}>Replace</Button>
                              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={uploadingAudioKey === story.id} onClick={() => void removeUploadedAudio(index)}>Remove</Button>
                            </div>
                          </>
                        ) : (
                          <Button type="button" variant="outline" className="w-full gap-2" disabled={uploadingAudioKey === story.id} onClick={() => requestAudioUpload(index)}>
                            {uploadingAudioKey === story.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Upload ElevenLabs recording
                          </Button>
                        )}
                      </div>
                      <p className={lh.footnote}>{story.narration_storage_path ? "Your uploaded recording stays attached until you replace or remove it." : "Without an upload, Listen creates and caches an ElevenLabs narration from the scene text."}</p>
                      <div className="flex gap-2">
                        <Button type="button" className={cn(lh.btnPrimary, "flex-1")} onClick={saveStoryEdit}>Save</Button>
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingStoryIndex(null)}>Cancel</Button>
                      </div>
                      <Button type="button" variant="destructive" className="w-full gap-2" disabled={deletingStoryId === story.id} onClick={() => void handleDeleteStory(index)}>
                        {deletingStoryId === story.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete scene
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className={cn(lh.bodySm, "line-clamp-3 leading-relaxed")}>{story.text}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" className={cn(lh.btnSecondary, "gap-2")} onClick={() => { onSelectedIndexChange(index); setOpenStory(openStory === index ? null : index); }}>
                          <BookOpen className="h-4 w-4" /> Read scene
                        </Button>
                        <Button type="button" className={cn(lh.btnPrimary, "gap-2")} disabled={narratingKey === story.id} onClick={() => void listenToScene(story.id, title, story.text, storyAudioUrls[story.id])}>
                          {narratingKey === story.id ? <Loader2 className="h-4 w-4 animate-spin" /> : audio?.key === story.id && playing ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          {listenLabel(story.id)}
                        </Button>
                      </div>
                      {story.chatgpt_url ? <a href={story.chatgpt_url} target="_blank" rel="noopener noreferrer" className={cn(lh.footnote, "flex items-center justify-center gap-1 underline-offset-2 hover:underline")}>Open ChatGPT reference <ExternalLink className="h-3 w-3" /></a> : null}
                    </>
                  )}
                </div>
              </article>
            );
          })}

          {openStory === "ace" ? <SceneReader title="ACE Is Working" text={ace.text} onClose={() => setOpenStory(null)} /> : null}
          {typeof openStory === "number" && stories[openStory] ? <SceneReader title={stories[openStory].title?.trim() || `Scene ${openStory + 1}`} text={stories[openStory].text} onClose={() => setOpenStory(null)} /> : null}
        </div>
      </section>

      {adding ? (
        <section className={cn(lh.cardFlat, "p-4 space-y-3")}>
          <h2 className={cn(lh.heading, "text-[15px]")}>New scene</h2>
          <JournalAiPrivacy.Provider value={Boolean(user && profile && profile.user_id === user.id) && !profile?.journal_e2e_enabled}>
            <div className="flex items-center gap-2"><DictateButton userId={user?.id} webSpeechOnly onAppend={(chunk) => setNewStoryText((text) => `${text} ${chunk}`.trim())} /><span className="text-sm">Speak a new scene</span></div>
          </JournalAiPrivacy.Provider>
          <MorningVoiceField value={newStoryText} onChange={setNewStoryText} multiline rows={5} label="New story scene" placeholder="Describe the scene in present tense…" />
          <div className="flex gap-2">
            <Button type="button" className={cn(lh.btnSecondary, "h-9")} onClick={handleAddStory}>Add to library</Button>
            <Button type="button" variant="ghost" className={cn(lh.btnGhost, "h-9")} onClick={() => { setAdding(false); setNewStoryText(""); }}>Cancel</Button>
          </div>
        </section>
      ) : (
        <Button type="button" variant="outline" className={cn(lh.btnGhost, "h-10 w-full justify-center gap-1.5 border-dashed")} onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add a scene
        </Button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,image/heic,image/heif,.heic,.heif" className="hidden" onChange={(e) => void handleCoverFile(e.target.files)} />
      <input ref={audioFileInputRef} type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a" className="hidden" onChange={(e) => void handleAudioFile(e.target.files)} />
    </div>
  );
}

export function appendWorkbookStory(stories: WorkbookStory[], text: string): { stories: WorkbookStory[]; newIndex: number } {
  const next = [...stories, { id: newId(), text: text.trim() }];
  return { stories: next, newIndex: next.length - 1 };
}
