import { useCallback, useEffect, useRef, useState } from "react";
import { useJournalEditorCaretScroll } from "@/hooks/useJournalEditorCaretScroll";
import { useJournalEntryTextareaAutosize } from "@/hooks/useJournalEntryTextareaAutosize";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal, Maximize2, NotebookText, Plus, X, Trash2,
  Heading1, List as ListIcon, ListOrdered, CheckSquare, Quote,
  Table as TableIcon, Paperclip, Tag, Sparkles, Loader2, MapPin, PenLine, MessageCircle, Link2,
} from "lucide-react";
import InlineJournalChatTranscript from "@/components/journal/InlineJournalChatTranscript";
import InlineJournalChatComposer from "@/components/journal/InlineJournalChatComposer";
import { useInlineJournalChat } from "@/hooks/useInlineJournalChat";
import { composeChatTranscript } from "@/lib/journal/inlineJournalChat";
import { isChatJournalExport } from "@/lib/journal/chatJournalEntry";
import { saveChatAsJournalEntry } from "@/lib/journal/saveChatAsJournalEntry";
import ChatJournalView from "@/components/journal/ChatJournalView";
import JournalLiveChatCollapsible from "@/components/journal/JournalLiveChatCollapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { PrivacyBlurInput } from "@/components/writing/PrivacyBlurInput";
import { toast } from "@/hooks/use-toast";
import { Journal } from "@/lib/journal/journals";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoodPicker } from "./MoodPicker";
import { TagInput } from "./TagInput";
import { uploadEntryPhotos, getSignedPhotoUrls } from "@/lib/journal/photos";
import { formatTemp } from "@/lib/journal/context";
import { coerceJournalEntryKind, ENTRY_KIND_META } from "@/lib/journal/entryKinds";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import SketchPad from "@/components/journal/SketchPad";
import { JournalSketchInline, partitionJournalPhotos } from "@/components/journal/JournalSketchInline";
import { autosaveSketchPhoto } from "@/lib/journal/sketchPhotos";
import { upsertSketchAndTranscribe } from "@/lib/journal/sketchTranscription";
import { suggestJournalEntryTitle } from "@/lib/journal/suggestTitle";
import { shouldSuggestJournalTitle } from "@/lib/journal/entryDisplay";
import {
  persistJournalChatIncludeGeneral,
  readJournalChatIncludeGeneralDefault,
} from "@/lib/journal/chatComposerSettings";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  persistResponseDepthSetting,
  readResponseDepthSetting,
  type ResponseDepthSetting,
} from "@/lib/journal/responseDepth";
import { syncEntryWikilinks } from "@/lib/journal/links";
import EntryLinksPanel from "@/components/journal/EntryLinksPanel";
import { JournalPrivacyBlurToolbarButton } from "@/components/journal/JournalPrivacyBlurToggle";
import { DictInterimPreview } from "@/components/journal/DictInterimPreview";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";

interface EntryRow {
  id: string;
  title: string | null;
  body: string;
  summary: string | null;
  mood: number | null;
  tags: string[];
  entry_at_ts: string;
  pinned: boolean;
  analyze_for_mirror: boolean;
  journal_id: string | null;
  location_name: string | null;
  weather: string | null;
  weather_temp_c: number | null;
  weather_icon: string | null;
  entry_kind: string | null;
}

export default function EntryEditorPane({
  entryId,
  journals,
  onClose,
  onChanged,
  onNew,
  onDeleted,
}: {
  entryId: string | null;
  journals: Journal[];
  onClose: () => void;
  onChanged: () => void;
  onNew: () => void;
  onDeleted: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<EntryRow | null>(null);
  const [photos, setPhotos] = useState<{ id: string; storage_path: string; url?: string }[]>([]);
  const [showMeta, setShowMeta] = useState(false);
  const [scoring, setScoring] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSuggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenerationRef = useRef(0);
  const entryRef = useRef<EntryRow | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const [sketchOpen, setSketchOpen] = useState(false);
  const [replyWithAi, setReplyWithAi] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [includeGeneral, setIncludeGeneral] = useState(readJournalChatIncludeGeneralDefault);
  const [responseDepth, setResponseDepth] = useState<ResponseDepthSetting>(() =>
    readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
  );
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [entryNotFound, setEntryNotFound] = useState(false);
  const [linksReloadKey, setLinksReloadKey] = useState(0);
  const paneScrollRef = useRef<HTMLElement | null>(null);
  const togglePrivacyBlur = useJournalPrivacyBlurStore((s) => s.toggleJournalPrivacyBlur);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        togglePrivacyBlur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePrivacyBlur]);

  const reloadEntryFromServer = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("journal_entries")
      .select(
        "id,title,body,summary,mood,tags,entry_at_ts,pinned,analyze_for_mirror,journal_id,location_name,weather,weather_temp_c,weather_icon,entry_kind",
      )
      .eq("id", id)
      .maybeSingle();
    const row = (data as EntryRow | null) ?? null;
    if (row && entryRef.current?.id === id) {
      entryRef.current = row;
      setEntry(row);
    }
    return row;
  }, []);

  const applySketchUpload = useCallback(
    async (entryId: string, upload: { storage_path: string; photo_id: string | null }) => {
      const urls = await getSignedPhotoUrls([upload.storage_path]);
      setPhotos((prev) => {
        const rest = prev.filter((p) => p.storage_path !== upload.storage_path);
        return [
          ...rest,
          {
            id: upload.photo_id ?? `sketch-${entryId}`,
            storage_path: upload.storage_path,
            url: urls[upload.storage_path],
          },
        ];
      });
    },
    [],
  );

  // Load entry
  useEffect(() => {
    if (!entryId) {
      setEntry(null);
      setPhotos([]);
      setLoadingEntry(false);
      setEntryNotFound(false);
      return;
    }
    let cancelled = false;
    setLoadingEntry(true);
    setEntryNotFound(false);
    setEntry(null);
    setPhotos([]);
    (async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          "id,title,body,summary,mood,tags,entry_at_ts,pinned,analyze_for_mirror,journal_id,location_name,weather,weather_temp_c,weather_icon,entry_kind",
        )
        .eq("id", entryId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadingEntry(false);
        toast({ title: "Couldn't load entry", description: error.message, variant: "destructive" });
        return;
      }
      const row = (data as EntryRow | null) ?? null;
      if (!row) {
        setLoadingEntry(false);
        setEntryNotFound(true);
        return;
      }
      setEntry(row);
      setReplyWithAi(row.entry_kind === "chat");
      setChatDraft("");
      const { data: ph } = await supabase
        .from("journal_photos")
        .select("id,storage_path")
        .eq("entry_id", entryId);
      if (cancelled) return;
      const urls = await getSignedPhotoUrls((ph ?? []).map((p) => p.storage_path));
      if (cancelled) return;
      setPhotos((ph ?? []).map((p) => ({ ...p, url: urls[p.storage_path] })));
      setLoadingEntry(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  useEffect(() => {
    return () => dictateRef.current?.stop();
  }, []);

  useEffect(() => {
    dictateRef.current?.stop();
    setDictInterim("");
    setChatDraft("");
  }, [entryId]);

  const queueSaveRef = useRef<(patch: Partial<EntryRow>) => void>(() => {});

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (titleSuggestTimer.current) clearTimeout(titleSuggestTimer.current);
    };
  }, []);

  const scheduleTitleSuggestion = (row: EntryRow) => {
    if (!shouldSuggestJournalTitle(row.title, row.body, row.summary)) return;
    if (titleSuggestTimer.current) clearTimeout(titleSuggestTimer.current);
    titleSuggestTimer.current = setTimeout(async () => {
      const cur = entryRef.current;
      if (!cur || cur.id !== row.id || cur.title?.trim()) return;
      const res = await suggestJournalEntryTitle({ entryId: cur.id, body: cur.body });
      if (!res.ok || !res.title) return;
      entryRef.current = { ...cur, title: res.title };
      setEntry((prev) => (prev?.id === cur.id ? { ...prev, title: res.title } : prev));
      onChanged();
    }, 2500);
  };

  // Autosave on entry mutation
  const queueSave = (patch: Partial<EntryRow>) => {
    const cur = entryRef.current;
    if (!cur) return;
    const merged = { ...cur, ...patch };
    entryRef.current = merged;
    setEntry(merged);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const generation = ++saveGenerationRef.current;
    saveTimer.current = setTimeout(async () => {
      if (generation !== saveGenerationRef.current) return;
      const { error } = await supabase
        .from("journal_entries")
        .update(patch)
        .eq("id", merged.id)
        .eq("user_id", user.id);
      if (generation !== saveGenerationRef.current) return;
      if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
      else {
        onChanged();
        if ("body" in patch) {
          if (user?.id) {
            void syncEntryWikilinks(user.id, merged.id, merged.body).then(() => {
              setLinksReloadKey((k) => k + 1);
            });
          }
          if (!("title" in patch)) scheduleTitleSuggestion(merged);
        }
      }
    }, 400);
  };
  queueSaveRef.current = queueSave;

  const canReplyWithAi =
    !!entry && entry.entry_kind !== "vent" && entry.entry_kind !== "listening";
  const inlineChatMode = replyWithAi && canReplyWithAi;
  const showSavedChatView =
    !!entry &&
    !inlineChatMode &&
    isChatJournalExport(entry.body, entry.summary);

  useJournalEntryTextareaAutosize(bodyRef, inlineChatMode || showSavedChatView ? "" : (entry?.body ?? ""));

  useJournalEditorCaretScroll({
    scrollRef: paneScrollRef,
    kbInset: 0,
    enabled: !!entry && !inlineChatMode && !showSavedChatView,
    fixedBottomInsetPx: 24,
    topInsetPx: 16,
  });

  const handleDictateAppend = useCallback(
    (chunk: string) => {
      if (inlineChatMode) {
        setChatDraft((d) => mergeDictatedText(d, chunk));
        return;
      }
      const cur = entryRef.current;
      if (!cur) return;
      queueSaveRef.current({ body: mergeDictatedText(cur.body, chunk) });
    },
    [inlineChatMode],
  );

  const dictateButton = (
    <DictateButton
      ref={dictateRef}
      userId={user?.id}
      size={inlineChatMode ? "md" : "sm"}
      className={inlineChatMode ? "h-9 w-9 shrink-0 rounded-full" : undefined}
      onAppend={handleDictateAppend}
      onInterim={setDictInterim}
    />
  );

  const persistChatTranscript = useCallback((body: string) => {
    queueSaveRef.current({ body, entry_kind: "chat" });
  }, []);

  const [finalizingChat, setFinalizingChat] = useState(false);

  const {
    chatId,
    chatTurns,
    aiBusy,
    chatScrollRef,
    chatBottomRef,
    ensureSession,
    sendMessage,
    scrollToBottom,
  } = useInlineJournalChat({
    userId: user?.id,
    entryId: entry?.id ?? null,
    journalId: entry?.journal_id,
    title: entry?.title,
    active: inlineChatMode,
    includeGeneralKnowledge: includeGeneral,
    onPersistTranscript: persistChatTranscript,
  });

  useEffect(() => {
    persistJournalChatIncludeGeneral(includeGeneral);
  }, [includeGeneral]);

  useEffect(() => {
    persistResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY, responseDepth);
  }, [responseDepth]);

  const openChatMode = async () => {
    if (!canReplyWithAi) {
      toast({ title: "Not available for this entry type" });
      return;
    }
    setReplyWithAi(true);
    const ensured = await ensureSession();
    if (ensured && entryRef.current?.entry_kind !== "chat") {
      queueSave({ entry_kind: "chat" });
    }
    scrollToBottom();
  };

  const exitChatMode = () => {
    setReplyWithAi(false);
    setChatDraft("");
  };

  const handleChatSend = async () => {
    const text = chatDraft.trim();
    if (!text || aiBusy) return;
    setChatDraft("");
    dictateRef.current?.stop();
    setDictInterim("");
    const ok = await sendMessage(text);
    if (!ok) setChatDraft(text);
  };

  const finalizeChatEntry = async () => {
    if (!entry?.id || finalizingChat) return;
    setFinalizingChat(true);
    try {
      if (chatTurns.length > 0) {
        persistChatTranscript(composeChatTranscript(chatTurns, chatDraft));
      }
      await saveChatAsJournalEntry({ journalEntryId: entry.id });
      const { data: refreshed } = await supabase
        .from("journal_entries")
        .select(
          "id,title,body,summary,mood,tags,entry_at_ts,pinned,analyze_for_mirror,journal_id,location_name,weather,weather_temp_c,weather_icon,entry_kind",
        )
        .eq("id", entry.id)
        .maybeSingle();
      if (refreshed) {
        const row = refreshed as EntryRow;
        entryRef.current = row;
        setEntry(row);
      }
      toast({ title: "Saved as journal entry" });
      setReplyWithAi(false);
      onChanged();
    } catch (e) {
      toast({ title: "Could not save chat", description: String(e), variant: "destructive" });
    } finally {
      setFinalizingChat(false);
    }
  };

  const journal = journals.find((j) => j.id === entry?.journal_id) ?? null;

  const { sketches: sketchPhotos, attachments: attachmentPhotos } = partitionJournalPhotos(photos);

  // Toolbar markdown insert
  const insert = (before: string, after = "", placeholder = "") => {
    const ta = bodyRef.current;
    const cur = entryRef.current;
    if (!ta || !cur) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = cur.body.slice(start, end) || placeholder;
    const next = cur.body.slice(0, start) + before + sel + after + cur.body.slice(end);
    queueSave({ body: next });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + sel.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const onPickPhotos = async (files: FileList | null): Promise<{ storage_path: string }[] | undefined> => {
    if (!files || !files.length || !entry || !user) return undefined;
    try {
      const uploaded = await uploadEntryPhotos(user.id, entry.id, Array.from(files));
      const { data } = await supabase
        .from("journal_photos")
        .insert(uploaded.map((u) => ({
          user_id: user.id,
          entry_id: entry.id,
          storage_path: u.storage_path,
          width: u.width,
          height: u.height,
        })))
        .select("id,storage_path");
      const urls = await getSignedPhotoUrls((data ?? []).map((p: { storage_path: string }) => p.storage_path));
      setPhotos((p) => [...p, ...((data ?? []).map((d: { id: string; storage_path: string }) => ({ ...d, url: urls[d.storage_path] })))]);
      return (data ?? []).map((d: { storage_path: string }) => ({ storage_path: d.storage_path }));
    } catch (e) {
      toast({ title: "Photo upload failed", description: String(e), variant: "destructive" });
      return undefined;
    }
  };

  const removePhoto = async (id: string, storage_path: string) => {
    setPhotos((p) => p.filter((x) => x.id !== id));
    await supabase.storage.from("journal-photos").remove([storage_path]).catch(() => {});
    await supabase.from("journal_photos").delete().eq("id", id);
  };

  const remove = async () => {
    if (!entry) return;
    dictateRef.current?.stop();
    if (!confirm("Delete this entry permanently?")) return;
    await supabase.from("journal_entries").delete().eq("id", entry.id).eq("user_id", user.id);
    onDeleted();
  };

  const togglePin = async () => {
    if (!entry) return;
    queueSave({ pinned: !entry.pinned });
  };

  const scoreNow = async () => {
    if (!entry) return;
    dictateRef.current?.stop();
    if (entry.entry_kind === "vent") {
      toast({ title: "Vents aren't analyzed", description: "This entry is private — the mirror stays away from it." });
      return;
    }
    setScoring(true);
    if (!entry.analyze_for_mirror) {
      await supabase
        .from("journal_entries")
        .update({ analyze_for_mirror: true })
        .eq("id", entry.id)
        .eq("user_id", user.id);
    }
    const { error } = await supabase.functions.invoke("journal-score-entry", { body: { entry_id: entry.id } });
    setScoring(false);
    if (error) toast({ title: "Couldn't score", description: error.message, variant: "destructive" });
    else toast({ title: "Entry scored — see Worldview Mirror" });
    onChanged();
  };

  if (entryId && loadingEntry) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entryId && entryNotFound) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center text-center px-8">
        <NotebookText className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-[15px] font-semibold">Entry not found</p>
        <p className="text-[13px] text-muted-foreground mt-1">This entry may have been deleted.</p>
      </div>
    );
  }

  if (!entry) {
    entryRef.current = null;
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center text-center px-8">
        <NotebookText className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="text-[15px] font-semibold">No entry selected</p>
        <p className="text-sm text-muted-foreground mt-1">Pick one from the list, or create a new one.</p>
        <button
          onClick={onNew}
          className="mt-4 inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New entry
        </button>
      </div>
    );
  }

  entryRef.current = entry;

  const dt = new Date(entry.entry_at_ts);
  const dateLabel = dt.toLocaleString(undefined, {
    month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border/60 bg-background/90 px-3 backdrop-blur-md">
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="Close editor"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center text-[13px] text-muted-foreground tabular-nums">
          {dateLabel}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" title="More">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={togglePin}>
              {entry.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/journal/${entry.id}/edit`)}>
              Open in full editor
            </DropdownMenuItem>
            {chatId && (
              <DropdownMenuItem onClick={() => navigate(`/my-ai/${chatId}`)}>
                Open in My AI
              </DropdownMenuItem>
            )}
            {entry.entry_kind === "chat" && (
              <>
                <DropdownMenuItem onClick={() => navigate(`/journal/chat/${entry.id}`)}>
                  Open chat session
                </DropdownMenuItem>
                <DropdownMenuItem disabled={finalizingChat} onClick={() => void finalizeChatEntry()}>
                  Save as journal entry
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={remove} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => setShowMeta((v) => !v)}
          className={`p-1.5 rounded-md hover:bg-muted ${showMeta ? "text-primary" : "text-muted-foreground"}`}
          title="Toggle details"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onNew}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="New entry"
        >
          <Plus className="w-4 h-4" />
        </button>
      </header>

      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border/60 bg-background/90 px-3 backdrop-blur-md scrollbar-hide">
        <TBtn title="Heading" onClick={() => insert("\n# ", "", "Heading")}><Heading1 className="w-4 h-4" /></TBtn>
        <TBtn title="Bullet list" onClick={() => insert("\n- ", "", "item")}><ListIcon className="w-4 h-4" /></TBtn>
        <TBtn title="Numbered list" onClick={() => insert("\n1. ", "", "item")}><ListOrdered className="w-4 h-4" /></TBtn>
        <TBtn title="Checklist" onClick={() => insert("\n- [ ] ", "", "task")}><CheckSquare className="w-4 h-4" /></TBtn>
        <TBtn title="Quote" onClick={() => insert("\n> ", "", "quote")}><Quote className="w-4 h-4" /></TBtn>
        <TBtn title="Wikilink ([[note]], [[video:…]], [[belief:…]])" onClick={() => insert("[[", "]]", "title")}><Link2 className="w-4 h-4" /></TBtn>
        <TBtn title="Table" onClick={() => insert("\n| col1 | col2 |\n| --- | --- |\n| ", " | |\n", "")}><TableIcon className="w-4 h-4" /></TBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <TBtn title="Attach photo" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="w-4 h-4" />
        </TBtn>
        <TBtn title="Handwritten" onClick={() => { dictateRef.current?.stop(); setSketchOpen(true); }}>
          <PenLine className="w-4 h-4" />
        </TBtn>
        <TBtn title="Tags" onClick={() => setShowMeta(true)}><Tag className="w-4 h-4" /></TBtn>
        <TBtn
          title={inlineChatMode ? "Back to writing" : "Chat with AI"}
          onClick={() => (inlineChatMode ? exitChatMode() : void openChatMode())}
          className={inlineChatMode ? "text-primary bg-primary/10" : undefined}
        >
          <MessageCircle className="w-4 h-4" />
        </TBtn>
        {!inlineChatMode ? dictateButton : null}
        <JournalPrivacyBlurToolbarButton />
        <TBtn title="AI score" onClick={scoreNow}>
          {scoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </TBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPickPhotos(e.target.files)}
        />
      </div>

      {/* Body scrolls inside the card; header/toolbar stay fixed like the list pane. */}
      <div
        ref={paneScrollRef}
        data-journal-editor-scroll
        className="journal-pane-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-8 pb-4 pt-6">
          <PrivacyBlurInput
            value={entry.title ?? ""}
            onChange={(e) => queueSave({ title: e.target.value })}
            placeholder="Title"
            className="text-[22px] font-semibold tracking-tight border-0 px-0 focus-visible:ring-0 shadow-none h-auto py-2 placeholder:text-muted-foreground/50 flex-shrink-0"
          />

          {!inlineChatMode && sketchPhotos.length > 0 ? (
            <JournalSketchInline
              sketches={sketchPhotos}
              className="my-4"
              onOpenSketch={() => {
                dictateRef.current?.stop();
                setSketchOpen(true);
              }}
              onRemove={removePhoto}
            />
          ) : null}

          {attachmentPhotos.length > 0 && !inlineChatMode && (
            <div className={`my-4 grid gap-2 ${attachmentPhotos.length === 1 ? "" : "grid-cols-2"}`}>
              {attachmentPhotos.map((p) => (
                <div key={p.id} className="relative group rounded-lg overflow-hidden">
                  {p.url && <img src={p.url} alt="" className="w-full max-h-96 object-cover" />}
                  <button
                    onClick={() => removePhoto(p.id, p.storage_path)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {inlineChatMode ? (
            <InlineJournalChatTranscript
              scrollRef={chatScrollRef}
              bottomRef={chatBottomRef}
              turns={chatTurns}
              aiBusy={aiBusy}
              dictInterim={dictInterim}
              className="-mx-2 px-2"
            />
          ) : showSavedChatView ? (
            <ChatJournalView
              body={entry.body}
              summary={entry.summary}
            />
          ) : (
            <>
              <PolishedTextarea
                ref={bodyRef}
                polishResetKey={entry.id}
                value={entry.body}
                onChange={(e) => queueSave({ body: e.target.value })}
                placeholder="What happened today? What are you carrying?"
                className="!block w-full !min-h-0 border-0 px-0 py-0 focus-visible:ring-0 shadow-none resize-none overflow-hidden font-sans text-[16px] leading-relaxed [field-sizing:content]"
              />
              <DictInterimPreview
                text={dictInterim}
                className="mt-1 text-sm italic leading-relaxed text-muted-foreground/80"
              />
              {chatTurns.length > 0 ? (
                <JournalLiveChatCollapsible turns={chatTurns} className="mt-6" />
              ) : null}
            </>
          )}

          {!inlineChatMode && !showSavedChatView && entry.id ? (
            <EntryLinksPanel
              entryId={entry.id}
              reloadKey={linksReloadKey}
              className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-4"
            />
          ) : null}

          {showMeta && !inlineChatMode && (
            <div className="mt-6 space-y-4 pt-4 border-t border-border/40">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Entry type</label>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Dreams, praise reports, and testimonies are grouped under Faith journal. Vents stay private — hidden
                  from main feeds and never analyzed.
                </p>
                <select
                  className="mt-2 h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
                  value={entry.entry_kind ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = v ? coerceJournalEntryKind(v) : null;
                    const patch: Partial<EntryRow> =
                      next === "vent"
                        ? { entry_kind: next, analyze_for_mirror: false }
                        : { entry_kind: next };
                    queueSave(patch);
                  }}
                  aria-label="Entry type"
                >
                  <option value="">General journal</option>
                  <option value="dream">{ENTRY_KIND_META.dream.label}</option>
                  <option value="praise_report">{ENTRY_KIND_META.praise_report.label}</option>
                  <option value="testimony">{ENTRY_KIND_META.testimony.label}</option>
                  <option value="vent">{ENTRY_KIND_META.vent.label} (private)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Mood</label>
                <div className="mt-2"><MoodPicker value={entry.mood} onChange={(m) => queueSave({ mood: m })} /></div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Tags</label>
                <div className="mt-2"><TagInput tags={entry.tags ?? []} onChange={(t) => queueSave({ tags: t })} /></div>
              </div>
            </div>
          )}

          <footer className="mt-auto flex flex-wrap items-center gap-3 border-t border-border/40 pt-4 pb-1 text-[12px] text-muted-foreground">
            {journal && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: `hsl(${journal.color})` }} />
                {journal.name}
              </span>
            )}
            {entry.weather_temp_c != null && (
              <span className="inline-flex items-center gap-1">
                {entry.weather_icon} {formatTemp(entry.weather_temp_c)} {entry.weather}
              </span>
            )}
            {entry.location_name && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {entry.location_name}
              </span>
            )}
          </footer>
      </div>
      </div>

      {inlineChatMode && (
        <div className="flex-shrink-0 border-t border-border/60 px-6 py-3 bg-background">
          <div className="max-w-2xl mx-auto">
            <InlineJournalChatComposer
              value={chatDraft}
              onChange={setChatDraft}
              onSend={() => void handleChatSend()}
              onExit={exitChatMode}
              dictateControl={dictateButton}
              aiBusy={aiBusy}
              rounded="card"
              onAttachPhotos={() => fileInputRef.current?.click()}
              onHandwritten={() => {
                dictateRef.current?.stop();
                setSketchOpen(true);
              }}
              includeGeneral={includeGeneral}
              onIncludeGeneralChange={setIncludeGeneral}
              responseDepth={responseDepth}
              onResponseDepthChange={setResponseDepth}
              onOpenInMyAi={chatId ? () => navigate(`/my-ai/${chatId}`) : undefined}
              extraActions={
                entry.entry_kind === "chat" ? (
                  <button
                    type="button"
                    disabled={finalizingChat || aiBusy}
                    onClick={() => void finalizeChatEntry()}
                    className="text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {finalizingChat ? "Saving…" : "Save as journal entry"}
                  </button>
                ) : chatId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/my-ai/${chatId}`)}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Open in My AI
                  </button>
                ) : null
              }
            />
          </div>
        </div>
      )}

      <SketchPad
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        draftKey={entry ? `entry:${entry.id}` : undefined}
        onAutosave={
          user && entry
            ? async (file) => {
                const upload = await autosaveSketchPhoto(user.id, entry.id, file);
                await applySketchUpload(entry.id, upload);
                onChanged();
              }
            : undefined
        }
        onSave={async (file) => {
          if (!user || !entry) return;
          toast({ title: "Reading your handwritten note…", description: "AI is transcribing your handwriting." });
          if (saveTimer.current) {
            clearTimeout(saveTimer.current);
            saveTimer.current = null;
          }
          saveGenerationRef.current += 1;
          const result = await upsertSketchAndTranscribe(user.id, entry.id, file);
          await applySketchUpload(entry.id, result);
          if (!result.ok) {
            toast({
              title: "Transcription failed",
              description: result.error ?? "Your sketch was saved — try again.",
              variant: "destructive",
            });
            return;
          }
          if (result.skipped) {
            toast({ title: "Handwritten note saved", description: "This handwritten note was already transcribed." });
            onChanged();
            return;
          }
          await reloadEntryFromServer(entry.id);
          onChanged();
          toast({
            title: result.title ? "Entry named and transcribed" : "Handwritten note transcribed",
            description: result.title
              ? `“${result.title}” — ${result.summary ? "summary and full text" : "text"} added to your entry.`
              : result.summary
                ? "Summary and full text were added to your journal body."
                : "Text was added to your journal body.",
          });
        }}
        filename={`sketch-${entry.id}`}
      />

    </div>
  );
}

function TBtn({
  title,
  onClick,
  children,
  className,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

