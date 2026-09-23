import { JournalVideoTransferStatus } from "./JournalVideoTransferStatus";
import { useJournalCaptionPreview } from "@/hooks/useJournalCaptionPreview";
import { useJournalPhotoRecovery } from "@/hooks/useJournalPhotoRecovery";
import { JournalAiPrivacy, JournalAiDocument } from "./JournalAiPrivacy";
import { journalCloudAiAllowed } from "@/lib/journal/journalAiPolicy";
import { JournalMediaRetry } from "./JournalMediaRetry";
import { attachJournalPhotos } from "@/lib/journal/attachJournalPhotos";
import { removeJournalAttachment } from "@/lib/journal/journalAttachmentOperations";
import { deleteJournalEntry } from "@/lib/journal/entryActions";
import { loadJournalDocumentRow, patchJournalDocument, flushJournalDocument, refreshJournalDocument, peekJournalDocument, journalSnapshotRow, JOURNAL_DOCUMENT_CHANGED } from "@/lib/journal/journalDocuments";
import { JournalSaveStatus } from "@/components/journal/JournalSaveStatus";
import { mergeVideoTranscriptSafely } from "@/lib/journal/journalTextMerge";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useJournalDeskWritingScroll } from "@/hooks/useJournalDeskWritingScroll";
import { useJournalEntryTextareaAutosize, resizeJournalTextarea } from "@/hooks/useJournalEntryTextareaAutosize";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal, Maximize2, NotebookText, Plus, X, Trash2,
  Heading1, List as ListIcon, ListOrdered, CheckSquare, Quote,
  Table as TableIcon, Image as ImageIcon, Tag, Sparkles, Loader2, MapPin, PenLine, MessageCircle, Link2,
} from "lucide-react";
import JournalVideoCaptureButton from "@/components/journal/JournalVideoCaptureButton";
import JournalBodyWithVideos from "@/components/journal/JournalBodyWithVideos";
import { useJournalEntryVideos } from "@/hooks/useJournalEntryVideos";
import { retranscribeJournalEntryVideo, updateEntryVideoTranscript } from "@/lib/journal/videos";
import { bodyWithLiveVideoTranscript, finalizeVideoJournalBody, prepareVideoJournalTranscript, replaceTranscriptBeforeVideo, resolveVideoAnchorOffset, resolveVideoJournalTranscript } from "@/lib/journal/journalVideoBody";
import { JOURNAL_VIDEO_SAVED_EVENT, type JournalVideoSavedEventDetail } from "@/lib/journal/journalVideoEntryMerge";
import { updateJournalVideoRecordingBodySnapForEntry } from "@/lib/journal/journalVideoRecordingRecovery";
import InlineJournalChatTranscript from "@/components/journal/InlineJournalChatTranscript";
import InlineJournalChatComposer from "@/components/journal/InlineJournalChatComposer";
import { useInlineJournalChat } from "@/hooks/useInlineJournalChat";
import { composeChatTranscript, isJournalReflectionKind } from "@/lib/journal/inlineJournalChat";
import {
  composeSavedChatJournalBody,
  isChatJournalExport,
  parseChatJournalEntry,
} from "@/lib/journal/chatJournalEntry";
import { journalEntryTitleInputClass, journalPlainWriteFieldClass } from "@/lib/journal/journalChatUi";
import JournalEntryMapDock from "@/components/journal/JournalEntryMapDock";
import { journalValueEqual, type JournalSnapshot } from "@/lib/journal/journalSaveQueue";
import { moodMeta } from "@/components/journal/MoodPicker";
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
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { formatTemp } from "@/lib/journal/context";
import { coerceJournalEntryKind, ENTRY_KIND_META } from "@/lib/journal/entryKinds";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { useDictationAutoFormat } from "@/hooks/useDictationAutoFormat";
import SketchPad from "@/components/journal/SketchPad";
import { JournalSketchInline, partitionJournalPhotos } from "@/components/journal/JournalSketchInline";
import { autosaveSketchPhoto } from "@/lib/journal/sketchPhotos";
import { upsertSketchAndTranscribe } from "@/lib/journal/sketchTranscription";
import { suggestJournalEntryTitle } from "@/lib/journal/suggestTitle";
import { entryFallbackTitle, shouldSuggestJournalTitle } from "@/lib/journal/entryDisplay";
import {
  entryBodyHasSketchTranscription,
  transcribeEntrySketchPaths,
} from "@/lib/journal/sketchTranscription";
import { useVideoJournalAutoTitle } from "@/hooks/useVideoJournalAutoTitle";
import { JournalEntrySummaryBlock } from "@/components/journal/JournalEntrySummaryBlock";
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
import { useJournalBodyMarkers } from "@/hooks/useJournalBodyMarkers";
import { JournalMarkerMenu } from "@/components/journal/JournalMarkerMenu";
import {
  mergeInlineTags,
  resolveJournalIdFromBody,
  tagsWithoutInline,
} from "@/lib/journal/inlineMarkers";
import { JournalPrivacyBlurToolbarButton } from "@/components/journal/JournalPrivacyBlurToggle";
import { AiWritingAssistToolbarButton } from "@/components/writing/AiWritingAssistToggle";
import { DictInterimPreview } from "@/components/journal/DictInterimPreview";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";
import {
  buildFlushPayload,
  mergePendingPatches,
} from "@/lib/journal/journalEntryAutosave";
import {
  fetchJournalEntryDetail,
  updateJournalEntry,
} from "@/lib/journal/journalEntryDb";
import { cn } from "@/lib/utils";

interface EntryRow {
  id: string;
  revision: number;
  user_id: string;
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
  lat: number | null;
  lng: number | null;
  e2e_encrypted?: boolean;
  contentLocked?: boolean;
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
  onChanged: (snapshot?: JournalSnapshot) => void;
  onNew: () => void;
  onDeleted: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<EntryRow | null>(null);
  const [photos, setPhotos] = useState<{ id: string; storage_path: string; url?: string }[]>([]);
  useJournalPhotoRecovery(user?.id, entryId, setPhotos);
  const { videos, error: videoLoadError, reload: reloadVideos, remove: removeVideo } = useJournalEntryVideos(entryId);
  const [showMeta, setShowMeta] = useState(false);
  const [scoring, setScoring] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyCaretRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<Partial<EntryRow>>({});
  const titleSuggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenerationRef = useRef(0);
  const entryRef = useRef<EntryRow | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const videoLiveSnapRef = useRef<{ body: string; anchor: number } | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const { preview: videoCaptionPreview, start: startVideoCaption, update: handleVideoLiveTranscript, clear: clearVideoCaption } =
    useJournalCaptionPreview(user?.id && entryId ? `${user.id}:${entryId}` : null, entry?.body ?? "",
      entry?.id === entryId && journalCloudAiAllowed(entry));
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
  const [bodyEditing, setBodyEditing] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [videoSummarizing, setVideoSummarizing] = useState(false);
  const [videoRetranscribingId, setVideoRetranscribingId] = useState<string | null>(null);
  const paneScrollRef = useRef<HTMLElement | null>(null);
  const entryInitialFocusRef = useRef<string | null>(null);
  const sketchTranscribeAttemptedRef = useRef<string | null>(null);
  const [transcribingSketch, setTranscribingSketch] = useState(false);
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
    if (!user?.id) return null;
    const row = await refreshJournalDocument(user.id, id);
    if (entryRef.current?.id === id) {
      entryRef.current = row as EntryRow;
      setEntry(row as EntryRow);
    }
    return row as EntryRow;
  }, [user?.id]);

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

  useEffect(() => {
    return () => dictateRef.current?.stop();
  }, []);

  useEffect(() => {
    dictateRef.current?.stop();
    setDictInterim("");
    setChatDraft("");
    setBodyEditing(false);
    setBodyFocused(false);
  }, [entryId]);

  const queueSaveRef = useRef<(patch: Partial<EntryRow>) => void>(() => {});

  const videoAutoTitle = useVideoJournalAutoTitle({
    title: entry?.title ?? "",
    setTitle: (t) => queueSaveRef.current({ title: t }),
    entryAt: entry?.entry_at_ts ?? undefined,
    entryId: entry?.id ?? null,
    onSummary: (s) => queueSaveRef.current({ summary: s }),
    onSummarizingChange: setVideoSummarizing,
  });
  const linksReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (titleSuggestTimer.current) clearTimeout(titleSuggestTimer.current);
      if (linksReloadTimer.current) clearTimeout(linksReloadTimer.current);
    };
  }, []);

  const scheduleLinksReload = useCallback(() => {
    if (linksReloadTimer.current) clearTimeout(linksReloadTimer.current);
    linksReloadTimer.current = setTimeout(() => {
      linksReloadTimer.current = null;
      setLinksReloadKey((k) => k + 1);
    }, 2500);
  }, []);

  const scheduleTitleSuggestion = (row: EntryRow) => {
    if (row.e2e_encrypted || row.contentLocked || !shouldSuggestJournalTitle(row.title, row.body, row.summary)) return;
    if (titleSuggestTimer.current) clearTimeout(titleSuggestTimer.current);
    titleSuggestTimer.current = setTimeout(async () => {
      const cur = entryRef.current;
      if (!user?.id || !cur || cur.id !== row.id || cur.title?.trim() || !journalCloudAiAllowed(cur)) return;
      const res = await suggestJournalEntryTitle({ entryId: cur.id, body: cur.body });
      if (!res.ok || !res.title || entryRef.current?.id !== cur.id) return;
      // Read the acknowledged row through the coordinator. Never restore the
      // body captured before the title request or display an unpersisted title.
      await reloadEntryFromServer(cur.id).catch(() => {});
    }, 2500);
  };

  const flushSave = useCallback(async (opts?: { silent?: boolean }): Promise<boolean> => {
    const cur = entryRef.current;
    if (!cur || !user?.id || cur.contentLocked) return !cur;
    const result = await flushJournalDocument(user.id, cur.id);
    if (result.ok === false && !opts?.silent) toast({ title: "Entry not saved to the cloud", description: result.error.message, variant: "destructive" });
    return result.ok;
  }, [user?.id]);
  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  const queueSave = (patch: Partial<EntryRow>) => {
    const cur = entryRef.current;
    if (!cur || !user?.id || cur.contentLocked) return;
    try {
      const next = patchJournalDocument(user.id, cur.id, patch);
      entryRef.current = next as EntryRow;
      setEntry((previous) => journalValueEqual(previous, next) ? previous : next as EntryRow);
    } catch (error) {
      toast({ title: "Save paused", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };
  queueSaveRef.current = queueSave;

  useEffect(() => {
    const recovered = async () => {
      const id = entryRef.current?.id;
      if (!id) return;
      const { data, error } = await supabase.from("journal_photos").select("id,storage_path").eq("entry_id", id);
      if (error || entryRef.current?.id !== id) return;
      const urls = await getSignedPhotoUrls((data ?? []).map((row) => row.storage_path));
      if (entryRef.current?.id === id) setPhotos((data ?? []).map((row) => ({ ...row, url: urls[row.storage_path] })));
      onChangedRef.current();
    };
    const changed = () => { void recovered().catch(() => {}); };
    window.addEventListener("yourbible:journal-attachments-recovered", changed);
    return () => window.removeEventListener("yourbible:journal-attachments-recovered", changed);
  }, []);

  useEffect(() => {
    const removed = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; entryId: string }>).detail;
      if (detail?.userId === user?.id && detail.entryId === entryId) {
        entryRef.current = null; setEntry(null); setPhotos([]); setEntryNotFound(true);
      }
    };
    window.addEventListener("yourbible:journal-entry-deleted", removed);
    return () => window.removeEventListener("yourbible:journal-entry-deleted", removed);
  }, [user?.id, entryId]);

  const lastAcknowledgedRevision = useRef<number | null>(null);
  const acknowledgedBodyRef = useRef<string | null>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  useEffect(() => {
    if (!user?.id || !entryId) return;
    const onDocumentChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; entryId: string }>).detail;
      if (detail?.userId !== user.id || detail.entryId !== entryId) return;
      const queue = peekJournalDocument(user.id, entryId);
      if (!queue || entryRef.current?.id !== entryId) return;
      const state = queue.getState();
      const next = journalSnapshotRow(state.snapshot) as EntryRow;
      entryRef.current = next;
      // Storage durability/status notifications must not repaint the editor.
      setEntry((previous) => journalValueEqual(previous, next) ? previous : next);
      if (state.status === "saved" && next.revision !== lastAcknowledgedRevision.current) {
        lastAcknowledgedRevision.current = next.revision;
        onChangedRef.current(state.snapshot);
        const previousBody = acknowledgedBodyRef.current;
        acknowledgedBodyRef.current = next.body;
        if (!next.e2e_encrypted && next.body !== previousBody && (next.body.includes("[[") || previousBody?.includes("[["))) {
          void syncEntryWikilinks(user.id, entryId, next.body).then(() => scheduleLinksReload());
        }
        scheduleTitleSuggestion(next);
      }
    };
    window.addEventListener(JOURNAL_DOCUMENT_CHANGED, onDocumentChange);
    return () => window.removeEventListener(JOURNAL_DOCUMENT_CHANGED, onDocumentChange);
  }, [user?.id, entryId, scheduleLinksReload]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushSave({ silent: true });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flushSave]);

  useEffect(() => {
    return () => {
      void flushSave({ silent: true });
    };
  }, [flushSave]);

  // Load entry — only re-run when entryId changes (not when parent re-renders).
  useEffect(() => {
    if (!entryId) {
      setEntry(null);
      setPhotos([]);
      setLoadingEntry(false);
      setEntryNotFound(false);
      entryRef.current = null;
      sketchTranscribeAttemptedRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      await flushSaveRef.current({ silent: true });
      if (cancelled) return;

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      pendingSaveRef.current = {};
      saveGenerationRef.current += 1;
      entryInitialFocusRef.current = null;
      sketchTranscribeAttemptedRef.current = null;
      entryRef.current = null;

      setLoadingEntry(true);
      setEntryNotFound(false);
      setEntry(null);
      setPhotos([]);
      setBodyEditing(false);
      setBodyFocused(false);

      let row: EntryRow | null = null;
      try {
        row = (await loadJournalDocumentRow(user.id, entryId)) as EntryRow | null;
      } catch (error) {
        if (cancelled) return;
        setLoadingEntry(false);
        toast({
          title: "Couldn't load entry",
          description: error instanceof Error ? error.message : "Try again",
          variant: "destructive",
        });
        return;
      }
      if (cancelled) return;
      if (!row) {
        setLoadingEntry(false);
        setEntryNotFound(true);
        return;
      }
      const fallbackTitle = entryFallbackTitle(row.body, row.summary);
      if (
        !row.title?.trim() &&
        fallbackTitle &&
        !shouldSuggestJournalTitle(row.title, row.body, row.summary)
      ) {
        row = { ...row, title: fallbackTitle };
      }
      entryRef.current = row;
      setEntry(row);
      lastAcknowledgedRevision.current = row.revision;
      acknowledgedBodyRef.current = row.body;
      // Always open in the normal write layout; chat lives in a collapsed accordion.
      setReplyWithAi(false);
      setChatDraft("");
      if (shouldSuggestJournalTitle(row.title, row.body, row.summary)) {
        scheduleTitleSuggestion(row);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entry switch only; flush via ref
  }, [entryId]);

  const sketchStoragePaths = useMemo(() => {
    const { sketches } = partitionJournalPhotos(photos);
    return sketches.map((s) => s.storage_path);
  }, [photos]);

  const needsSketchTranscription =
    journalCloudAiAllowed(entry) &&
    sketchStoragePaths.length > 0 &&
    !entryBodyHasSketchTranscription(entry.body);

  useEffect(() => {
    if (!entry || !needsSketchTranscription || transcribingSketch) return;
    if (sketchTranscribeAttemptedRef.current === entry.id) return;
    sketchTranscribeAttemptedRef.current = entry.id;
    setTranscribingSketch(true);
    (async () => {
      const tx = await transcribeEntrySketchPaths(entry.id, sketchStoragePaths);
      setTranscribingSketch(false);
      if (!tx.ok) {
        toast({
          title: "Couldn't read handwriting",
          description: tx.error,
          variant: "destructive",
        });
        // A failed automatic attempt remains attempted; the user can explicitly retry.
        return;
      }
      if (tx.transcribed > 0 || tx.title || tx.body) {
        const reloaded = await reloadEntryFromServer(entry.id);
        if (reloaded) {
          const withTitle =
            !reloaded.title?.trim() && entryFallbackTitle(reloaded.body, reloaded.summary)
              ? { ...reloaded, title: entryFallbackTitle(reloaded.body, reloaded.summary) }
              : reloaded;
          entryRef.current = withTitle as EntryRow;
          setEntry(withTitle as EntryRow);
          if (shouldSuggestJournalTitle(withTitle.title, withTitle.body, withTitle.summary)) {
            scheduleTitleSuggestion(withTitle as EntryRow);
          }
        }
        onChanged();
      }
    })();
  }, [
    entry,
    needsSketchTranscription,
    sketchStoragePaths,
    transcribingSketch,
    reloadEntryFromServer,
    onChanged,
  ]);

  const cloudAiAllowed = journalCloudAiAllowed(entry);
  const canReplyWithAi = cloudAiAllowed && entry.entry_kind !== "vent" && entry.entry_kind !== "listening";
  const reflectionMode = !!entry && isJournalReflectionKind(entry.entry_kind);
  const inlineChatMode = replyWithAi && canReplyWithAi;
  const showSavedChatView =
    !!entry &&
    !inlineChatMode &&
    isChatJournalExport(entry.body, entry.summary);
  const chatParsed = showSavedChatView && entry
    ? parseChatJournalEntry(entry.body, entry.summary)
    : null;
  const editingChatSummary = showSavedChatView && bodyEditing;
  const plainWriteLayout = !!entry && !inlineChatMode && !showSavedChatView;
  const bodyTextareaValue = editingChatSummary
    ? (entry?.summary ?? chatParsed?.summary ?? "")
    : (entry?.body ?? "");

  const bodyMarkers = useJournalBodyMarkers({
    userId: user?.id,
    body: bodyTextareaValue,
    tags: entry?.tags ?? [],
    onTagsChange: () => {},
    journalId: entry?.journal_id ?? null,
    journals,
    enabled: !!entry && !inlineChatMode && (!showSavedChatView || bodyEditing),
    syncMetadata: false,
    onEntryKindChange: (kind) => {
      const cur = entryRef.current;
      if (!cur || cur.entry_kind === kind) return;
      queueSaveRef.current({ entry_kind: kind });
      toast({ title: `Marked as ${ENTRY_KIND_META[kind].label}` });
    },
  });

  const handleBodyChange = useCallback(
    (nextText: string, cursor?: number) => {
      const cur = entryRef.current;
      if (!cur) return;
      if (cursor != null) bodyCaretRef.current = cursor;
      bodyMarkers.updateActiveMarker(nextText, cursor ?? nextText.length);
      if (editingChatSummary && chatParsed && chatParsed.kind !== "plain") {
        const newBody = composeSavedChatJournalBody(nextText, chatParsed.messages);
        queueSaveRef.current({ body: newBody, summary: nextText || null });
        return;
      }
      const manualTags = tagsWithoutInline(cur.body, cur.tags);
      const patch: Partial<EntryRow> = {
        body: nextText,
        tags: mergeInlineTags(nextText, manualTags),
      };
      const resolvedJournal = resolveJournalIdFromBody(
        nextText,
        journals.map((j) => ({ id: j.id, name: j.name })),
      );
      if (resolvedJournal && resolvedJournal !== cur.journal_id) {
        patch.journal_id = resolvedJournal;
        const name = journals.find((j) => j.id === resolvedJournal)?.name;
        if (name) toast({ title: `Filed under ${name}` });
      }
      queueSaveRef.current(patch);
    },
    [bodyMarkers, chatParsed, editingChatSummary, journals],
  );

  const handleBodyKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (bodyMarkers.handleMarkerKeyDown(e)) {
        const el = e.currentTarget;
        handleBodyChange(el.value, el.selectionStart ?? el.value.length);
      }
    },
    [bodyMarkers, handleBodyChange],
  );

  const handleBodySelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const el = e.currentTarget;
      bodyCaretRef.current = el.selectionStart ?? el.value.length;
      bodyMarkers.updateActiveMarker(el.value, el.selectionStart ?? el.value.length);
    },
    [bodyMarkers],
  );

  const handleMarkerPick = useCallback(
    (suggestion: Parameters<typeof bodyMarkers.pickSuggestion>[0]) => {
      const next = bodyMarkers.pickSuggestion(suggestion);
      if (next) handleBodyChange(next.text, next.cursor);
    },
    [bodyMarkers, handleBodyChange],
  );

  const handleTagsManualChange = useCallback(
    (nextTags: string[]) => {
      const cur = entryRef.current;
      if (!cur) return;
      queueSaveRef.current({
        tags: mergeInlineTags(cur.body, tagsWithoutInline(cur.body, nextTags)),
      });
    },
    [],
  );

  const textareaAutosizeValue =
    inlineChatMode || (showSavedChatView && !bodyEditing) ? "" : bodyTextareaValue;

  const textareaAutosizeEnabled =
    !!entry && !loadingEntry && !inlineChatMode && !(showSavedChatView && !bodyEditing);

  useJournalEntryTextareaAutosize(bodyRef, textareaAutosizeValue, textareaAutosizeEnabled);

  const { scrollToCaretEnd } = useJournalDeskWritingScroll({
    scrollRef: paneScrollRef,
    enabled: textareaAutosizeEnabled,
    value: textareaAutosizeValue,
    resetKey: entryId,
  });

  const focusBodyEditor = useCallback(() => {
    const el = bodyRef.current;
    if (!el || !plainWriteLayout || titleFocused) return;
    setBodyFocused(true);
    requestAnimationFrame(() => {
      resizeJournalTextarea(el);
      el.focus();
      const pos = el.value.length;
      el.setSelectionRange(pos, pos);
      scrollToCaretEnd();
    });
  }, [plainWriteLayout, scrollToCaretEnd, titleFocused]);

  const focusBodyEditorRef = useRef(focusBodyEditor);
  focusBodyEditorRef.current = focusBodyEditor;

  useEffect(() => {
    if (loadingEntry || !entry || !plainWriteLayout) return;
    if (entryInitialFocusRef.current === entry.id) return;
    entryInitialFocusRef.current = entry.id;
    // Empty entries: let the user choose title or body — don't force body focus.
    if (!entry.body?.trim()) return;
    requestAnimationFrame(() => focusBodyEditorRef.current());
  }, [entryId, loadingEntry, entry?.id, entry?.body, plainWriteLayout]);

  const handleDictateAppend = useCallback(
    (chunk: string) => {
      if (inlineChatMode) {
        setChatDraft((d) => mergeDictatedText(d, chunk));
        return;
      }
      const cur = entryRef.current;
      if (!cur) return;
      const next = mergeDictatedText(cur.body, chunk);
      handleBodyChange(next, next.length);
    },
    [handleBodyChange, inlineChatMode],
  );

  const resolveBodyVideoAnchor = useCallback((): number => {
    const cur = entryRef.current;
    const body = cur?.body ?? "";
    const el = bodyRef.current;
    const editorFocused = Boolean(el && document.activeElement === el);
    const caret = editorFocused
      ? (el!.selectionStart ?? bodyCaretRef.current)
      : bodyCaretRef.current;
    return resolveVideoAnchorOffset(body, {
      caret,
      bodyEditorFocused: editorFocused,
    });
  }, []);

  const handleVideoRecordingStart = useCallback((anchorOffset: number) => {
    const cur = entryRef.current;
    if (!cur || !journalCloudAiAllowed(cur)) { videoLiveSnapRef.current = null; return; }
    const snap = {
      body: cur.body,
      // The capture dialog has focus now; use the position saved before opening it.
      anchor: Math.max(0, Math.min(anchorOffset, cur.body.length)),
    };
    videoLiveSnapRef.current = snap;
    startVideoCaption(snap.body, snap.anchor);
    updateJournalVideoRecordingBodySnapForEntry(cur.id, snap.body, snap.anchor);
    videoAutoTitle.onRecordingStart();
  }, [videoAutoTitle, startVideoCaption]);

  const handleVideoRecordingCancelled = useCallback(() => {
    clearVideoCaption();
    videoLiveSnapRef.current = null;
  }, [clearVideoCaption]);
  const handleVideoSaved = useCallback(async (_payload: {
    transcript: string; anchorOffset: number; liveTranscript?: string; peakLiveTranscript?: string; locallyQueued?: boolean;
  }) => {
    if (_payload.locallyQueued) {
      clearVideoCaption();
      videoLiveSnapRef.current = null;
      return;
    }
    await reloadVideos();
    onChangedRef.current(); // A real attachment change refreshes media metadata.
    const id = entryRef.current?.id;
    if (id && user?.id) {
      const row = await refreshJournalDocument(user.id, id);
      if (entryRef.current?.id === id) {
        entryRef.current = row as EntryRow;
        setEntry(row as EntryRow);
        if (journalCloudAiAllowed(row)) await videoAutoTitle.onRecordingComplete(row.body);
      }
    }
    clearVideoCaption();
    videoLiveSnapRef.current = null;
  }, [user?.id, reloadVideos, videoAutoTitle, clearVideoCaption]);

  const handleRetranscribeVideo = useCallback(
    async (video: { id: string; storage_path: string; anchor_offset: number }) => {
      if (!user?.id || !entryId) return;
      setVideoRetranscribingId(video.id);
      try {
        const stt = await retranscribeJournalEntryVideo(user.id, video.storage_path);
        if (!stt.text.trim()) {
          toast({
            title: "Couldn't transcribe video",
            description:
              stt.error ??
              "No speech was detected. If the clip is only a few seconds long, the full recording may not have saved.",
            variant: "destructive",
          });
          return;
        }
        const prepared = prepareVideoJournalTranscript(stt.text);
        await updateEntryVideoTranscript(video.id, prepared);
        const cur = entryRef.current;
        if (cur) {
          const nextBody = mergeVideoTranscriptSafely({ current: cur.body, transcript: prepared, anchor: video.anchor_offset, snap: null });
          handleBodyChange(nextBody);
          await videoAutoTitle.onRecordingComplete(nextBody);
        }
        await reloadVideos();
        toast({
          title: "Transcript updated",
          description:
            stt.source === "storage-video"
              ? "Recovered the full transcript from your saved video."
              : undefined,
        });
      } catch (e) {
        toast({
          title: "Couldn't transcribe video",
          description: e instanceof Error ? e.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setVideoRetranscribingId(null);
      }
    },
    [user?.id, entryId, handleBodyChange, reloadVideos, videoAutoTitle],
  );

  const { onListeningChange: onDictationListeningChange, formatting: dictationFormatting } =
    useDictationAutoFormat({
      getBody: () => entryRef.current?.body ?? "",
      setBody: (next) => handleBodyChange(next),
      enabled: !inlineChatMode,
    });

  const dictateButton = (
    <DictateButton
      ref={dictateRef}
      userId={user?.id}
      size={inlineChatMode ? "md" : "sm"}
      className={inlineChatMode ? "h-9 w-9 shrink-0 rounded-full" : undefined}
      onAppend={handleDictateAppend}
      onInterim={setDictInterim}
      onListeningChange={onDictationListeningChange}
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
    streamingAssistantId,
    chatScrollRef,
    chatBottomRef,
    ensureSession,
    sendMessage,
    bootstrapReflection,
    scrollToBottom,
  } = useInlineJournalChat({
    userId: user?.id,
    entryId: entry?.id ?? null,
    journalId: entry?.journal_id,
    title: entry?.title,
    active: inlineChatMode,
    reflectionMode,
    reflectionEntrySnapshot: entry
      ? { title: entry.title, summary: entry.summary, body: entry.body }
      : null,
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
    await flushSave({ silent: true });
    setReplyWithAi(true);
    const ensured = await ensureSession();
    if (!ensured) {
      setReplyWithAi(false);
      return;
    }
    if (!reflectionMode && entryRef.current?.entry_kind !== "chat") {
      queueSave({ entry_kind: "chat" });
    }
    if (reflectionMode) {
      await bootstrapReflection();
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
      const refreshed = await fetchJournalEntryDetail(entry.id);
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
      const ownerEntryId = entry.id;
      const attached = await attachJournalPhotos(user.id, ownerEntryId, Array.from(files));
      if (entryRef.current?.id === ownerEntryId) setPhotos((previous) => [...new Map([...previous, ...attached].map((item) => [item.id, item])).values()]);
      onChangedRef.current();
      return attached.map((item) => ({ storage_path: item.storage_path }));
    } catch (e) {
      toast({ title: "Photo upload failed", description: String(e), variant: "destructive" });
      return undefined;
    }
  };

  const removePhoto = async (id: string, _storagePath: string) => {
    const ownerEntryId = entryRef.current?.id;
    if (!user?.id || !ownerEntryId) return;
    try {
      await removeJournalAttachment(user.id, ownerEntryId, id, "journal_photos");
      if (entryRef.current?.id === ownerEntryId) setPhotos((previous) => previous.filter((photo) => photo.id !== id));
      onChangedRef.current();
    } catch (error) {
      toast({ title: "Photo removal needs attention", description: error instanceof Error ? error.message : "Retry removal. Your file has been retained.", variant: "destructive" });
    }
  };

  const remove = async () => {
    const current = entryRef.current;
    if (!current || !user?.id || !confirm("Delete this entry permanently?")) return;
    dictateRef.current?.stop();
    const { error } = await deleteJournalEntry(current.id, user.id);
    if (error) { toast({ title: "Entry was not deleted", description: error.message, variant: "destructive" }); return; }
    if (!entryRef.current || entryRef.current.id === current.id) onDeleted();
  };

  const togglePin = async () => {
    if (!entry) return;
    queueSave({ pinned: !entry.pinned });
  };

  const handleClose = async () => {
    dictateRef.current?.stop();
    if (!(await flushSave())) return;
    onClose();
  };

  const openFocusedEntry = async () => {
    if (!entry || !user?.id) return;
    dictateRef.current?.stop();
    if (inlineChatMode && chatTurns.length > 0) {
      persistChatTranscript(composeChatTranscript(chatTurns, chatDraft));
    }
    if (!(await flushSave())) return;
    navigate(`/journal/${entry.id}/edit`);
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

  if (entryId && entry?.contentLocked) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center text-center px-8 gap-3">
        <p className="text-[15px] font-semibold">This entry is encrypted</p>
        <p className="text-[13px] text-muted-foreground max-w-sm">
          Unlock your journal passphrase in Settings → Journal privacy to read and edit.
        </p>
        <button
          type="button"
          onClick={() => navigate("/settings?section=privacy")}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Open journal privacy
        </button>
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

  const openBodyEditing = () => {
    setBodyEditing(true);
    requestAnimationFrame(() => {
      bodyRef.current?.focus();
      const len = bodyRef.current?.value.length ?? 0;
      bodyRef.current?.setSelectionRange(len, len);
    });
  };

  const dt = new Date(entry.entry_at_ts);
  const dateLabel = dt.toLocaleString(undefined, {
    month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
  const mood = moodMeta(entry.mood);

  return (
    <JournalAiPrivacy.Provider value={cloudAiAllowed}><JournalAiDocument.Provider value={entry.id}><div className="relative flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border/60 bg-background/90 px-3 backdrop-blur-md">
        <button
          onClick={() => void handleClose()}
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
            <DropdownMenuItem onClick={() => void openFocusedEntry()}>
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
          onClick={() => void openFocusedEntry()}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="Open entry"
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

      <JournalSaveStatus userId={user?.id} entryId={entry.id} />

      <JournalMediaRetry error={videoLoadError} retry={reloadVideos} />
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
        <TBtn title="Add photo" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />
        </TBtn>
        {!inlineChatMode ? (
          <JournalVideoCaptureButton
            userId={user?.id}
            entryId={entry?.id ?? null}
            getAnchorOffset={resolveBodyVideoAnchor}
            getBodySnap={() => videoLiveSnapRef.current}
            onRecordingStart={handleVideoRecordingStart}
            onLiveTranscript={handleVideoLiveTranscript}
            onRecordingCancelled={handleVideoRecordingCancelled}
            onVideoSaved={handleVideoSaved}
          />
        ) : null}
        <TBtn title="Handwritten" onClick={() => { dictateRef.current?.stop(); setSketchOpen(true); }}>
          <PenLine className="w-4 h-4" />
        </TBtn>
        <TBtn title="Tags" onClick={() => setShowMeta(true)}><Tag className="w-4 h-4" /></TBtn>
        <TBtn
          title={inlineChatMode ? "Back to writing" : reflectionMode ? "Talk with My AI about this entry" : "Chat with AI"}
          onClick={() => (inlineChatMode ? exitChatMode() : void openChatMode())}
          className={inlineChatMode ? "text-primary bg-primary/10" : undefined}
        >
          <MessageCircle className="w-4 h-4" />
        </TBtn>
        {!inlineChatMode ? dictateButton : null}
        <AiWritingAssistToolbarButton />
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
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", !plainWriteLayout && "min-h-0")}>
      <div
        ref={paneScrollRef as any}
        data-journal-editor-scroll
        className={cn(
          "journal-pane-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none]",
          plainWriteLayout && "flex flex-col",
        )}
        onPointerDown={(e) => {
          if (!plainWriteLayout || bodyFocused || titleFocused) return;
          const target = e.target as HTMLElement;
          if (
            target.closest(
              "[data-journal-title], textarea, input, button, a, label, [role='button']",
            )
          ) {
            return;
          }
          focusBodyEditor();
        }}
      >
      <div
        className={cn(
          "mx-auto flex w-full max-w-2xl flex-col px-8 pb-4 pt-6",
          plainWriteLayout ? "min-h-full shrink-0" : "min-h-full",
        )}
        style={plainWriteLayout ? { paddingBottom: "var(--journal-writing-room, 160px)" } : undefined}
      >
          <JournalVideoTransferStatus userId={user?.id} entryId={entry.id} />
          <div
            className="relative z-10 shrink-0"
            data-journal-title
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!entry.title?.trim() ? (
              <span
                aria-hidden
                className={cn(
                  journalEntryTitleInputClass,
                  "pointer-events-none absolute inset-x-0 top-2 z-0 text-muted-foreground/50",
                )}
              >
                Title
              </span>
            ) : null}
            <PrivacyBlurInput
              value={entry.title ?? ""}
              onChange={(e) => {
                videoAutoTitle.markTitleEdited();
                queueSave({ title: e.target.value });
              }}
              aria-label="Title"
              onFocus={() => {
                setTitleFocused(true);
                setBodyFocused(false);
              }}
              onBlur={() => setTitleFocused(false)}
              className={cn(
                journalEntryTitleInputClass,
                "relative z-[1] border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none h-auto py-2 flex-shrink-0",
              )}
            />
          </div>

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
              streamingAssistantId={streamingAssistantId}
              dictInterim={dictInterim}
              className="-mx-2 px-2"
            />
          ) : showSavedChatView ? (
            editingChatSummary ? (
              <>
                <PolishedTextarea
                  ref={bodyRef}
                  polishResetKey={entry.id}
                  value={bodyTextareaValue}
                  onChange={(e) => handleBodyChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                  placeholder="What happened today? What are you carrying?"
                  className={journalPlainWriteFieldClass}
                />
                <DictInterimPreview
                  text={dictInterim}
                  className="mt-1 text-sm italic leading-relaxed text-muted-foreground/80"
                />
                <ChatJournalView
                  body={entry.body}
                  summary={entry.summary}
                  hideSummary
                  className="mt-6"
                />
              </>
            ) : (
              <ChatJournalView
                body={entry.body}
                summary={entry.summary}
                onSummaryClick={openBodyEditing}
              />
            )
          ) : (
            <>
              {!inlineChatMode && (entry.summary?.trim() || videoSummarizing || videos.length > 0 || transcribingSketch) ? (
                <JournalEntrySummaryBlock
                  summary={entry.summary ?? ""}
                  onSummaryChange={(next) => queueSaveRef.current({ summary: next || null })}
                  summarizing={videoSummarizing || transcribingSketch}
                  alwaysShow={videos.length > 0}
                  showFullTextLabel={Boolean(entry.summary?.trim())}
                  className="mb-4"
                />
              ) : null}
              {!inlineChatMode && (videos.length > 0 || videoCaptionPreview) ? (
                <JournalBodyWithVideos
                  body={entry.body}
                  videos={videos}
                  captionPreview={videoCaptionPreview}
                  polishResetKey={entry.id}
                  bodyClassName={journalPlainWriteFieldClass}
                  onBodyChange={(next, cursor) => handleBodyChange(next, cursor)}
                  onRetranscribeVideo={(video) => void handleRetranscribeVideo(video)}
                  retranscribingVideoId={videoRetranscribingId}
                  onCaretChange={(offset) => {
                    bodyCaretRef.current = offset;
                  }}
                  onBodyFocus={() => setBodyFocused(true)}
                  onBodyBlur={() => {
                    bodyMarkers.dismissMarkerMenu();
                    setBodyFocused(false);
                  }}
                  onRemoveVideo={async (id, path) => {
                    try {
                      await removeVideo(id, path);
                      onChangedRef.current();
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
                <>
                  <div className="relative shrink-0">
                    <PolishedTextarea
                      ref={bodyRef}
                      polishResetKey={entry.id}
                      value={entry.body}
                      onChange={(e) =>
                        handleBodyChange(e.target.value, e.target.selectionStart ?? e.target.value.length)
                      }
                      onKeyDown={handleBodyKeyDown}
                      onSelect={handleBodySelect}
                      onFocus={() => {
                        setBodyFocused(true);
                        requestAnimationFrame(() => {
                          const el = bodyRef.current;
                          if (el) resizeJournalTextarea(el);
                        });
                      }}
                      onBlur={() => {
                        bodyMarkers.dismissMarkerMenu();
                        setBodyFocused(false);
                      }}
                      placeholder={
                        transcribingSketch
                          ? "Reading your handwritten note…"
                          : "What happened today? Type #tag or @journal name to organize."
                      }
                      wrapperClassName="shrink-0"
                      className={cn(journalPlainWriteFieldClass, "max-h-none")}
                    />
                    <JournalMarkerMenu
                      marker={bodyMarkers.activeMarker}
                      suggestions={bodyMarkers.suggestions}
                      activeIndex={bodyMarkers.menuIndex}
                      onPick={handleMarkerPick}
                      onHover={bodyMarkers.setMenuIndex}
                      className="absolute left-0 top-full z-20 mt-1 w-full max-w-sm"
                    />
                  </div>
                  <DictInterimPreview
                    text={dictInterim}
                    className="mt-1 text-sm italic leading-relaxed text-muted-foreground/80"
                  />
                  {dictationFormatting ? (
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Formatting dictation…
                    </p>
                  ) : null}
                  {transcribingSketch ? (
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Reading your handwritten note…
                    </p>
                  ) : null}
                </>
              )}
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
              {chatTurns.length > 0 ? (
                <JournalLiveChatCollapsible
                  turns={chatTurns}
                  className="mt-6"
                  label={reflectionMode ? "My AI conversation about this entry" : "AI conversation"}
                />
              ) : null}
              {!inlineChatMode && canReplyWithAi && (reflectionMode || entry.entry_kind === "chat") ? (
                (reflectionMode
                  ? entry.body?.trim() || videos.length > 0 || entry.summary?.trim()
                  : true) ? (
                  <button
                    type="button"
                    onClick={() => void openChatMode()}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    {reflectionMode
                      ? "Talk with My AI about this entry"
                      : chatTurns.length > 0
                        ? "Continue conversation"
                        : "Chat with AI"}
                  </button>
                ) : null
              ) : null}
            </>
          )}

          {!inlineChatMode && entry.id && (!plainWriteLayout || bodyFocused) ? (
            <EntryLinksPanel
              entryId={entry.id}
              reloadKey={linksReloadKey}
              className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-4"
            />
          ) : null}

          {!inlineChatMode && (entry.tags?.length > 0 || mood) && (!plainWriteLayout || bodyFocused) ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {mood ? (
                <span className={`text-xs font-medium ${mood.color}`}>{mood.label}</span>
              ) : null}
              {(entry.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}

          {showMeta && !inlineChatMode && (!plainWriteLayout || bodyFocused) && (
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
                <div className="mt-2"><TagInput tags={entry.tags ?? []} onChange={handleTagsManualChange} /></div>
              </div>
            </div>
          )}

          {!plainWriteLayout && (
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
          )}
      </div>
      </div>

      {plainWriteLayout ? (
        <JournalEntryMapDock
          lat={entry.lat} lng={entry.lng}
          journalName={journal?.name} journalColor={journal?.color}
          temperature={entry.weather_temp_c} weatherIcon={entry.weather_icon}
          weather={entry.weather} location={entry.location_name}
        />
      ) : null}
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
              placeholder={reflectionMode ? "Continue the conversation…" : "Type anything"}
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
          pendingSaveRef.current = {};
          if (saveTimer.current) {
            clearTimeout(saveTimer.current);
            saveTimer.current = null;
          }
          saveGenerationRef.current += 1;
          const result = await upsertSketchAndTranscribe(user.id, entry.id, file);
          await applySketchUpload(entry.id, result);
          if (result.ok === false) {
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

    </div></JournalAiDocument.Provider></JournalAiPrivacy.Provider>
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
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

