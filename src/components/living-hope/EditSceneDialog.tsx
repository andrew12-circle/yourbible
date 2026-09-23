import { useEffect, useRef, useState } from "react";
import { Image, Link2, Loader2, Music, Pause, Play, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { toast } from "@/hooks/use-toast";
import type { WorkbookStory } from "@/lib/livingHope/workbookTypes";
import { getSceneAudioUrl, removeSceneAudioFile, uploadSceneAudio, SCENE_AUDIO_ACCEPT } from "@/lib/livingHope/sceneAudio";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  story: WorkbookStory | null;
  index: number;
  userId: string | undefined;
  uploadingCover: boolean;
  onClose: () => void;
  onSave: (patch: Partial<WorkbookStory>) => void;
  onUploadCover: () => void;
  onDelete: () => Promise<void> | void;
};

export function EditSceneDialog({ open, story, index, userId, uploadingCover, onClose, onSave, onUploadCover, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [chatgptUrl, setChatgptUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const storyId = story?.id;

  useEffect(() => {
    if (!open || !story) return;
    setTitle(story.title ?? "");
    setText(story.text);
    setChatgptUrl(story.chatgpt_url ?? "");
    setPreviewUrl("");
    setPreviewPlaying(false);
    // Only reset when opening or switching scenes, not on every story patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storyId]);

  if (!story) return null;

  const save = () => {
    if (!text.trim()) {
      toast({ title: "Scene text can't be empty", variant: "destructive" });
      return;
    }
    onSave({ title: title.trim() || undefined, text: text.trim(), chatgpt_url: chatgptUrl.trim() || undefined });
    onClose();
  };

  const handleAudioFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (audioInputRef.current) audioInputRef.current.value = "";
    if (!file || !userId) return;
    setAudioBusy(true);
    try {
      const previous = story.uploaded_audio_path;
      const path = await uploadSceneAudio(userId, story.id, file);
      onSave({ uploaded_audio_path: path, uploaded_audio_name: file.name });
      if (previous && previous !== path) await removeSceneAudioFile(previous);
      setPreviewUrl("");
      setPreviewPlaying(false);
      toast({ title: "Audio uploaded", description: "Listen will now play this recording." });
    } catch (e) {
      toast({ title: "Couldn't upload audio", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setAudioBusy(false);
    }
  };

  const removeAudio = async () => {
    if (!story.uploaded_audio_path) return;
    setAudioBusy(true);
    try {
      await removeSceneAudioFile(story.uploaded_audio_path);
      onSave({ uploaded_audio_path: undefined, uploaded_audio_name: undefined });
      previewRef.current?.pause();
      setPreviewUrl("");
      setPreviewPlaying(false);
    } finally {
      setAudioBusy(false);
    }
  };

  const togglePreview = async () => {
    const el = previewRef.current;
    if (previewUrl && el) {
      if (el.paused) void el.play();
      else el.pause();
      return;
    }
    if (!story.uploaded_audio_path) return;
    setAudioBusy(true);
    try {
      const url = await getSceneAudioUrl(story.uploaded_audio_path);
      setPreviewUrl(url);
      requestAnimationFrame(() => void previewRef.current?.play());
    } catch (e) {
      toast({ title: "Couldn't play audio", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setAudioBusy(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setConfirmDelete(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const hasCover = Boolean(story.cover_storage_path || story.cover_image_url);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { previewRef.current?.pause(); onClose(); } }}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle>Edit scene</DialogTitle>
            <DialogDescription>Your words are saved exactly as written.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={lh.footnote} htmlFor="scene-title">Title</label>
              <Input id="scene-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Scene ${index + 1}`} />
            </div>

            <MorningVoiceField value={text} onChange={setText} multiline rows={10} label="Scene text" />

            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0" />
              <Input value={chatgptUrl} onChange={(e) => setChatgptUrl(e.target.value)} placeholder="Optional ChatGPT link" />
            </div>

            <Button type="button" variant="outline" className="w-full gap-2" disabled={uploadingCover} onClick={onUploadCover}>
              {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              {hasCover ? "Replace cover image" : "Upload cover image"}
            </Button>

            <section className={cn(lh.cardFlat, "space-y-3 p-3")}>
              <div>
                <p className={cn(lh.labelUpper, "mb-0.5")}>Audio / voice</p>
                <p className={lh.footnote}>Upload your finished narration (MP3, WAV, M4A). Listen will play it for this scene.</p>
              </div>
              {story.uploaded_audio_path ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void togglePreview()}
                    disabled={audioBusy}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    aria-label={previewPlaying ? "Pause preview" : "Play preview"}
                  >
                    {audioBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : previewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{story.uploaded_audio_name || "Uploaded narration"}</span>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 gap-2" disabled={audioBusy} onClick={() => audioInputRef.current?.click()}>
                  {audioBusy && !story.uploaded_audio_path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {story.uploaded_audio_path ? "Replace audio" : "Upload audio"}
                </Button>
                {story.uploaded_audio_path ? (
                  <Button type="button" variant="outline" className="flex-1 gap-2" disabled={audioBusy} onClick={() => void removeAudio()}>
                    <X className="h-4 w-4" /> Remove audio
                  </Button>
                ) : null}
              </div>
              {previewUrl ? (
                <audio ref={previewRef} src={previewUrl} onPlay={() => setPreviewPlaying(true)} onPause={() => setPreviewPlaying(false)} onEnded={() => setPreviewPlaying(false)} />
              ) : null}
              <input ref={audioInputRef} type="file" accept={SCENE_AUDIO_ACCEPT} className="hidden" onChange={(e) => void handleAudioFile(e.target.files)} />
            </section>
          </div>

          <DialogFooter className="mt-2 flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" className="gap-2 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete scene
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={onClose}>Cancel</Button>
              <Button type="button" className={cn(lh.btnPrimary, "flex-1 sm:flex-none")} onClick={save}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scene?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. The scene and its uploaded audio will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); void doDelete(); }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete scene"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
