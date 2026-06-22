import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Trash2, ChevronLeft } from "lucide-react";
import JournalVideoCaptureButton from "@/components/journal/JournalVideoCaptureButton";
import JournalBodyWithVideos from "@/components/journal/JournalBodyWithVideos";
import { useJournalEntryVideos } from "@/hooks/useJournalEntryVideos";
import { clampAnchorOffset, insertTranscriptAtAnchor, resolveVideoAnchorOffset } from "@/lib/journal/journalVideoBody";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PrivacyBlurInput } from "@/components/writing/PrivacyBlurInput";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { toast } from "@/hooks/use-toast";
import { deleteJournalEntry } from "@/lib/journal/entryActions";
import { fetchJournalEntryDetail, updateJournalEntry } from "@/lib/journal/journalEntryDb";
import { formatJournalLoadError } from "@/lib/journal/journalE2eSchema";
import { cn } from "@/lib/utils";

type Props = {
  entryId: string | null;
  notesJournalId: string;
  onChanged?: () => void;
  onDeleted?: () => void;
  onClose?: () => void;
};

export default function NotesEditorPane({ entryId, notesJournalId, onChanged, onDeleted, onClose }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef<Record<string, unknown>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyCaretRef = useRef<number | null>(null);
  const bodyStateRef = useRef("");
  bodyStateRef.current = body;
  const { videos, reload: reloadVideos, remove: removeVideo } = useJournalEntryVideos(entryId);

  const flushSave = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user || !entryId || !Object.keys(pendingRef.current).length) return;
      const payload = { ...pendingRef.current };
      pendingRef.current = {};
      setSaving(true);
      const { error } = await updateJournalEntry(user.id, entryId, payload, {
        journalId: notesJournalId,
      });
      setSaving(false);
      if (error) {
        pendingRef.current = { ...payload, ...pendingRef.current };
        if (!opts?.silent) {
          toast({ title: "Couldn't save note", description: error.message, variant: "destructive" });
        }
        return;
      }
      onChanged?.();
    },
    [user, entryId, notesJournalId, onChanged],
  );

  const queueSave = useCallback(
    (patch: Record<string, unknown>) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => void flushSave({ silent: true }), 600);
    },
    [flushSave],
  );

  const handleBodyChange = useCallback(
    (next: string, cursor?: number) => {
      if (cursor != null) bodyCaretRef.current = cursor;
      setBody(next);
      queueSave({ body: next });
    },
    [queueSave],
  );

  const handleVideoSaved = useCallback(
    ({ transcript, anchorOffset }: { transcript: string; anchorOffset: number }) => {
      void reloadVideos();
      if (!transcript.trim()) return;
      const cur = bodyStateRef.current;
      const anchor = clampAnchorOffset(cur, anchorOffset);
      handleBodyChange(insertTranscriptAtAnchor(cur, anchor, transcript));
    },
    [handleBodyChange, reloadVideos],
  );

  useEffect(() => {
    if (!entryId) {
      setTitle("");
      setBody("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const row = await fetchJournalEntryDetail(entryId);
        if (cancelled) return;
        if (!row) {
          toast({ title: "Note not found", variant: "destructive" });
          onClose?.();
          return;
        }
        setTitle(row.title ?? "");
        setBody(row.body ?? "");
        setTimeout(() => titleRef.current?.focus(), 50);
      } catch (e) {
        if (!cancelled) {
          toast({ title: "Couldn't load note", description: formatJournalLoadError(e), variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId, onClose]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flushSave({ silent: true });
    };
  }, [entryId, flushSave]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushSave({ silent: true });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flushSave]);

  const remove = async () => {
    if (!user || !entryId) return;
    if (!confirm("Delete this note?")) return;
    await flushSave({ silent: true });
    const { error } = await deleteJournalEntry(entryId, user.id);
    if (error) {
      toast({ title: "Couldn't delete note", description: error.message, variant: "destructive" });
      return;
    }
    onDeleted?.();
  };

  if (!entryId) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[hsl(48_30%_97%)] dark:bg-muted/20 px-8 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(48_96%_53%/_0.35)]">
          <span className="text-2xl" aria-hidden>
            📝
          </span>
        </div>
        <p className="text-[15px] font-medium text-foreground">Select a note</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Or tap + to start a new note — business, ideas, anything quick.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[hsl(48_30%_97%)] dark:bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[hsl(48_30%_97%)] dark:bg-muted/20">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-3 bg-[hsl(48_30%_97%)]/90 dark:bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onClose}
              aria-label="Back to notes"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : null}
          <div className="text-[12px] text-muted-foreground tabular-nums">
            {saving ? "Saving…" : "Saved"}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <JournalVideoCaptureButton
            userId={user?.id}
            entryId={entryId}
            getAnchorOffset={() => {
              const body = bodyStateRef.current;
              const el = bodyRef.current;
              const editorFocused = Boolean(el && document.activeElement === el);
              const caret = editorFocused
                ? (el!.selectionStart ?? bodyCaretRef.current)
                : bodyCaretRef.current;
              return resolveVideoAnchorOffset(body, {
                caret,
                bodyEditorFocused: editorFocused,
              });
            }}
            onVideoSaved={handleVideoSaved}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => void remove()}
            aria-label="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <PrivacyBlurInput
          ref={titleRef}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            queueSave({ title: e.target.value || null });
          }}
          placeholder="Title"
          className={cn(
            "w-full border-0 bg-transparent p-0 text-[22px] font-bold tracking-tight",
            "placeholder:text-muted-foreground/50 focus-visible:ring-0 shadow-none",
          )}
        />
        {videos.length > 0 ? (
          <JournalBodyWithVideos
            body={body}
            videos={videos}
            bodyClassName={cn(
              "mt-3 min-h-[50vh] w-full resize-none border-0 bg-transparent p-0 text-[16px] leading-relaxed",
              "placeholder:text-muted-foreground/50 focus-visible:ring-0 shadow-none",
            )}
            onBodyChange={handleBodyChange}
            onCaretChange={(offset) => {
              bodyCaretRef.current = offset;
            }}
            onRemoveVideo={async (id, path) => {
              try {
                await removeVideo(id, path);
              } catch (e) {
                toast({
                  title: "Couldn't remove video",
                  description: e instanceof Error ? e.message : "Try again",
                  variant: "destructive",
                });
              }
            }}
          />
        ) : (
          <PolishedTextarea
            ref={bodyRef}
            value={body}
            onChange={(e) =>
              handleBodyChange(
                e.target.value,
                e.target.selectionStart ?? e.target.value.length,
              )
            }
            onSelect={(e) => {
              bodyCaretRef.current = e.currentTarget.selectionStart ?? e.currentTarget.value.length;
            }}
            onFocus={(e) => {
              bodyCaretRef.current =
                e.currentTarget.selectionStart ?? e.currentTarget.value.length;
            }}
            placeholder="Start typing…"
            className={cn(
              "mt-3 min-h-[50vh] w-full resize-none border-0 bg-transparent p-0 text-[16px] leading-relaxed",
              "placeholder:text-muted-foreground/50 focus-visible:ring-0 shadow-none",
            )}
          />
        )}
      </div>
    </div>
  );
}
