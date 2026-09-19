import { useJournalCaptionPreview } from "./useJournalCaptionPreview";
import { useJournalPhotoRecovery } from "./useJournalPhotoRecovery";
import { requireJournalCloudAi } from "@/lib/journal/journalAiAccess";
import { journalCloudAiAllowed } from "@/lib/journal/journalAiPolicy";
import { attachJournalPhotos } from "@/lib/journal/attachJournalPhotos";
import { removeJournalAttachment } from "@/lib/journal/journalAttachmentOperations";
import { loadJournalDocumentRow, refreshJournalDocument } from "@/lib/journal/journalDocuments";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { DictateButtonHandle } from "@/components/journal/DictateButton";
import { partitionJournalPhotos } from "@/components/journal/JournalSketchInline";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { useDictationAutoFormat } from "@/hooks/useDictationAutoFormat";
import { useAuth } from "@/contexts/AuthContext";
import { useMiniPhoneEmbed } from "@/contexts/MiniPhoneEmbedContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { shouldSuggestJournalPhotos } from "@/lib/journal/suggestPhotos";
import { autosaveSketchPhoto, isJournalSketchAsset } from "@/lib/journal/sketchPhotos";
import {
  transcribeEntrySketchPaths,
  upsertSketchAndTranscribe,
} from "@/lib/journal/sketchTranscription";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { fetchJournalEntryDetail, insertJournalEntry, updateJournalEntry } from "@/lib/journal/journalEntryDb";
import { mergeInlineTags } from "@/lib/journal/inlineMarkers";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  persistResponseDepthSetting,
  readResponseDepthSetting,
  type ResponseDepthSetting,
} from "@/lib/journal/responseDepth";
import {
  persistJournalChatIncludeGeneral,
  persistJournalChatVoiceReplies,
  readJournalChatIncludeGeneralDefault,
  readJournalChatVoiceRepliesDefault,
} from "@/lib/journal/chatComposerSettings";
import { getCurrentContext } from "@/lib/journal/context";
import { useJournalEditorCaretScroll } from "@/hooks/useJournalEditorCaretScroll";
import { resizeJournalTextarea } from "@/hooks/useJournalEntryTextareaAutosize";
import {
  useLockBodyScrollWhenKeyboardActive,
  useVisualViewportMetrics,
} from "@/hooks/useKeyboardInset";
import { JOURNAL_EXPAND_HANDOFF_KEY, syncEntryWikilinks, type JournalExpandHandoffPayload } from "@/lib/journal/links";
import {
  coerceJournalEntryKind,
  ENTRY_KIND_META,
  kindToLifeSegment,
  parseJournalEntryKindParam,
  type JournalEntryKind,
} from "@/lib/journal/entryKinds";
import {
  composeListeningBody,
  isListeningBody,
  isListeningEmpty,
  parseListeningBody,
  type ListeningSectionKey,
  type ListeningSections,
} from "@/lib/journal/listeningEntry";
import { mergeAskedQuestionIntoThought } from "@/lib/journal/spiritListeningQuestions";
import { parseChatJournalEntry } from "@/lib/journal/chatJournalEntry";
import {
  composeChatTranscript,
  loadInlineChatTurns,
  type InlineChatTurn,
} from "@/lib/journal/inlineJournalChat";
import { streamMyAiChat } from "@/lib/myai/invokeMyAiChat";
import { createAssistantTtsSession } from "@/lib/ai/assistantTts";
import { useJournalBodyMarkers } from "@/hooks/useJournalBodyMarkers";
import { useJournalEntryVideos } from "@/hooks/useJournalEntryVideos";
import type { JournalVideoCaptureResult } from "@/hooks/useJournalVideoCapture";
import {
  bodyWithLiveVideoTranscript,
  finalizeVideoJournalBody,
  resolveVideoJournalTranscript,
  resolveVideoAnchorOffset,
} from "@/lib/journal/journalVideoBody";
import { JOURNAL_VIDEO_SAVED_EVENT, type JournalVideoSavedEventDetail } from "@/lib/journal/journalVideoEntryMerge";
import { updateJournalVideoRecordingBodySnapForEntry } from "@/lib/journal/journalVideoRecordingRecovery";
import { saveJournalVideoCaptureWithQueue } from "@/lib/journal/journalVideoUploadProcessor";
import {
  journalVideoCaptureSupported,
  journalVideoTranscriptEmptyMessage,
} from "@/lib/journal/videos";
import {
  useJournalComposePersistence,
  type ComposePersistenceSnapshot,
} from "@/hooks/useJournalComposePersistence";
import { hasMeaningfulComposeContent } from "@/lib/journal/composeEntryDraft";
import { usePendingJournalSketchAttachment } from "@/hooks/usePendingJournalSketchAttachment";
import { pendingJournalSketchKey } from "@/lib/journal/pendingJournalSketch";
import { useVideoJournalAutoTitle } from "@/hooks/useVideoJournalAutoTitle";
import {
  journalComposeCaretKeyboardInset,
  journalComposeUsesVisualViewportLayout,
} from "@/lib/journal/journalComposeKeyboardLayout";
import {
  createNativeJournalVideoDraftOwnerId,
  isNativeJournalVideoDraftOwnerId,
  nativeJournalVideoCaptureSupported,
  rememberNativeJournalVideoDraftEntry,
} from "@/lib/native/journalVideoNative";

interface BeliefOpt {
  id: string;
  topic: string;
  statement: string;
}

export function useNewJournalEntryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const chatRequested = params.get("chat") === "1";
  const {
    keyboardInset: kbInset,
    keyboardOpen,
    offsetTop: vvOffsetTop,
    viewportHeight,
  } = useVisualViewportMetrics();
  const inMiniPhone = useMiniPhoneEmbed();
  const isMobile = useIsMobile();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const manualSaveRef = useRef(false);
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loadedEncrypted, setLoadedEncrypted] = useState(false);
  const [entryKind, setEntryKind] = useState<JournalEntryKind | null>(null);
  const [entryAt, setEntryAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [verseRef, setVerseRef] = useState<string>("");
  const [beliefId, setBeliefId] = useState<string>("");
  const [beliefs, setBeliefs] = useState<BeliefOpt[]>([]);
  const [locationName, setLocationName] = useState("");
  const [analyzeForMirror, setAnalyzeForMirror] = useState(false);
  const [replyWithAi, setReplyWithAi] = useState<boolean>(false);
  const [includeGeneral, setIncludeGeneral] = useState(readJournalChatIncludeGeneralDefault);
  const [voiceReplies, setVoiceReplies] = useState(readJournalChatVoiceRepliesDefault);
  const [responseDepth, setResponseDepth] = useState<ResponseDepthSetting>(() =>
    readResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY),
  );
  const [journalId, setJournalId] = useState<string | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [weatherTempC, setWeatherTempC] = useState<number | null>(null);
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);

  const [existingPhotos, setExistingPhotos] = useState<
    { id: string; storage_path: string; url?: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [_busyLabel, setBusyLabel] = useState("Saving");
  const [inlineEntryId, setInlineEntryId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatTurns, setChatTurns] = useState<InlineChatTurn[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const abortAiRef = useRef<AbortController | null>(null);
  const voiceRepliesRef = useRef(voiceReplies);
  const mountedRef = useRef(true);
  const [dictInterim, setDictInterim] = useState("");
  const [dictating, setDictating] = useState(false);
  const [sketchOpen, setSketchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoTranscribing, setVideoTranscribing] = useState(false);
  const [videoSummarizing, setVideoSummarizing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [journalName, setJournalName] = useState<string>("Journal");
  const [composerFocused, setComposerFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);
  const [photoSuggestionDismissed, setPhotoSuggestionDismissed] = useState(false);
  const [loadedEditId, setLoadedEditId] = useState<string | null>(null);
  const [editLoadFailedId, setEditLoadFailedId] = useState<string | null>(null);
  const [nativeVideoDraftOwnerId, setNativeVideoDraftOwnerId] = useState<string | null>(null);
  const composerLockScrollYRef = useRef<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoCameraInputRef = useRef<HTMLInputElement | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const bottomDockRef = useRef<HTMLElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyCaretRef = useRef<number | null>(null);
  const focusBodyEditorRef = useRef<() => void>(() => {});
  const videoAnchorRef = useRef(0);
  const videoLiveSnapRef = useRef<{ body: string; anchor: number } | null>(null);
  const captureRequestHandledRef = useRef(false);
  const [listeningSections, setListeningSections] = useState<ListeningSections>({
    thought: "",
    words: "",
    plan: "",
    interpretation: "",
  });
  const lastSyncedListeningKey = useRef<string | null>(null);
  const handoffAppliedForKey = useRef<string | null>(null);
  const journalProseBeforeChatRef = useRef("");
  const [artifactReturnTo, setArtifactReturnTo] = useState<string | null>(null);
  const assistantTtsRef = useRef(createAssistantTtsSession({
    enabled: () => voiceRepliesRef.current,
    mounted: () => mountedRef.current,
  }));
  const sketchDraftKey = useMemo(
    () => pendingJournalSketchKey(user?.id, editId, null),
    [editId, user?.id],
  );
  const {
    pendingFiles,
    setPendingFiles,
    addPendingFiles,
    savePendingSketchFile,
    removePendingFile,
    clearStoredPendingSketch,
  } = usePendingJournalSketchAttachment({
    userId: user?.id,
    editId,
    draftKey: sketchDraftKey,
  });

  const isVent = entryKind === "vent";
  const isListening = entryKind === "listening";
  const cloudAiAllowed = journalCloudAiAllowed({ entry_kind: entryKind, journal_id: journalId, e2e_encrypted: loadedEncrypted });
  const { preview: videoCaptionPreview, start: startVideoCaption, update: handleVideoLiveTranscript, clear: clearVideoCaption } =
    useJournalCaptionPreview(user?.id ? `${user.id}:${editId ?? "new"}` : null, body, cloudAiAllowed);
  const canReplyWithAi = cloudAiAllowed && !isListening;
  useEffect(() => {
    if (!cloudAiAllowed) {
      abortAiRef.current?.abort();
      videoLiveSnapRef.current = null;
      clearVideoCaption();
    }
  }, [cloudAiAllowed, clearVideoCaption]);
  useEffect(() => {
    const deleted = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; entryId: string }>).detail;
      if (detail?.userId !== user?.id || detail.entryId !== (editId ?? inlineEntryId)) return;
      abortAiRef.current?.abort();
      setBody(""); setTitle(""); setSummary(""); setExistingPhotos([]);
      navigate("/journal", { replace: true });
    };
    window.addEventListener("yourbible:journal-entry-deleted", deleted);
    return () => window.removeEventListener("yourbible:journal-entry-deleted", deleted);
  }, [editId, inlineEntryId, user?.id, navigate]);
  const inlineChatMode = replyWithAi && canReplyWithAi;
  const visualViewportKeyboardLayout = journalComposeUsesVisualViewportLayout({
    isMobile,
    inMiniPhone,
    keyboardOpen,
  });
  const caretKeyboardInset = journalComposeCaretKeyboardInset(
    kbInset,
    visualViewportKeyboardLayout,
  );

  voiceRepliesRef.current = voiceReplies;

  const setInlineEntryIdWithNativeOwner = useCallback((id: string) => {
    if (user?.id && nativeVideoDraftOwnerId) {
      rememberNativeJournalVideoDraftEntry(user.id, nativeVideoDraftOwnerId, id);
    }
    setInlineEntryId(id);
  }, [nativeVideoDraftOwnerId, user?.id]);

  const getComposeSnapshot = useCallback(
    (): ComposePersistenceSnapshot => ({
      title,
      summary,
      body,
      tags,
      mood,
      entryKind,
      journalId,
      verseRef,
      beliefId,
      promptId,
      locationName,
      lat,
      lng,
      weather,
      weatherTempC,
      weatherIcon,
      analyzeForMirror,
      entryAt,
      listeningSections: isListening ? listeningSections : undefined,
    }),
    [
      title,
      summary,
      body,
      tags,
      mood,
      entryKind,
      journalId,
      verseRef,
      beliefId,
      promptId,
      locationName,
      lat,
      lng,
      weather,
      weatherTempC,
      weatherIcon,
      analyzeForMirror,
      entryAt,
      isListening,
      listeningSections,
    ],
  );

  const composePersistence = useJournalComposePersistence({
    userId: user?.id,
    editId,
    inlineEntryId,
    setInlineEntryId: setInlineEntryIdWithNativeOwner,
    entryKind,
    isListening,
    getSnapshot: getComposeSnapshot,
    enabled: !inlineChatMode,
    onDocumentChange: (patch) => {
      if ("title" in patch) setTitle(String(patch.title ?? ""));
      if ("summary" in patch) setSummary(String(patch.summary ?? ""));
      if ("body" in patch) setBody(String(patch.body ?? ""));
      if ("tags" in patch) setTags((patch.tags ?? []) as string[]);
    },
  });

  const {
    schedulePersist: scheduleComposePersist,
    flushServerSave: flushComposeSave,
    restoreLocalDraft,
    clearDraft: clearComposeDraft,
  } = composePersistence;

  useLockBodyScrollWhenKeyboardActive(
    !inMiniPhone &&
      !isMobile &&
      ((inlineChatMode && composerFocused) || bodyFocused),
    composerLockScrollYRef,
  );

  useEffect(() => {
    persistJournalChatIncludeGeneral(includeGeneral);
  }, [includeGeneral]);

  useEffect(() => {
    persistResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY, responseDepth);
  }, [responseDepth]);

  useEffect(() => {
    persistJournalChatVoiceReplies(voiceReplies);
    if (!voiceReplies) assistantTtsRef.current.stop();
  }, [voiceReplies]);

  useEffect(() => {
    const assistantTts = assistantTtsRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortAiRef.current?.abort();
      assistantTts.stop();
    };
  }, []);

  const { scrollToCaretEnd } = useJournalEditorCaretScroll({
    scrollRef: mainScrollRef,
    bottomDockRef: bodyFocused ? undefined : bottomDockRef,
    kbInset: caretKeyboardInset,
    enabled: !inlineChatMode,
    resetKey: editId ?? "journal-new",
    fixedBottomInsetPx:
      bodyFocused || (keyboardOpen && !inlineChatMode)
        ? 16
        : undefined,
    topInsetPx: inMiniPhone ? 12 : vvOffsetTop > 0 ? vvOffsetTop + 72 : 16,
  });

  useEffect(() => {
    if (!bodyFocused || inlineChatMode) return;
    const vv = window.visualViewport;
    if (!vv) {
      requestAnimationFrame(() => scrollToCaretEnd());
      return;
    }
    const sync = () => requestAnimationFrame(() => scrollToCaretEnd());
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [bodyFocused, inlineChatMode, kbInset, scrollToCaretEnd]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      chatBottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }, [chatTurns.length, aiBusy]);

  useEffect(() => {
    const v = params.get("verse");
    const r = params.get("ref");
    const jid = params.get("journalId");
    const pid = params.get("promptId");
    const promptText = params.get("prompt");
    const artifactTitle = params.get("artifactTitle");
    const artifactUrl = params.get("artifactUrl");
    const artifactTime = params.get("artifactTime");
    const artifactTranscript = params.get("artifactTranscript");
    const artifactClaims = params.get("artifactClaims");
    const returnTo = params.get("returnTo");
    if (returnTo) setArtifactReturnTo(decodeURIComponent(returnTo));
    if (jid) setJournalId(jid);
    if (pid) setPromptId(pid);
    if (r) setVerseRef(r);
    if (v) {
      setTitle((t) => t || (r ? `Reflection on ${r}` : "Verse reflection"));
      setBody((b) => b || `${r ? `${r}\n` : ""}"${v}"\n\n`);
    }
    if (promptText && !v) {
      setTitle((t) => t || promptText.slice(0, 80));
      setBody((b) => b || `> ${promptText}\n\n`);
    }
    if (artifactTranscript) {
      const decodedTitle = artifactTitle ? decodeURIComponent(artifactTitle) : "YouTube artifact reflection";
      const decodedUrl = artifactUrl ? decodeURIComponent(artifactUrl) : "";
      const decodedTranscript = decodeURIComponent(artifactTranscript);
      const decodedClaims = artifactClaims ? decodeURIComponent(artifactClaims) : "";
      setTitle((t) => t || decodedTitle);
      setBody((b) =>
        b ||
        [
          decodedUrl ? `Source: ${decodedUrl}` : "",
          artifactTime ? `Timestamp: ${artifactTime}s` : "",
          "",
          decodedClaims ? "Major key points extracted:" : "",
          decodedClaims,
          decodedClaims ? "" : "",
          "Transcript:",
          decodedTranscript,
          "",
          "Journal response:",
          "- What challenged my current beliefs?",
          "- What do I keep, reject, or revise?",
          "- What should become a memory or action?",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      setTags((ts) => (ts.length ? ts : ["artifact", "youtube"]));
    }
    const kindInit = parseJournalEntryKindParam(params.get("kind"));
    if (kindInit === "chat" && !editId) {
      navigate("/my-ai", { replace: true });
      return;
    }
    if (kindInit) {
      if (kindInit === "vent" && !editId) {
        navigate("/journal/vent", { replace: true });
        return;
      }
      setEntryKind(kindInit);
      setTitle((t) => t || `New ${ENTRY_KIND_META[kindInit].newTitleHint}`);
      if (kindInit !== "vent" && kindInit !== "listening") {
        setBody((b) => b || `${ENTRY_KIND_META[kindInit].placeholder}\n\n`);
      }
    }
  }, [params, editId, navigate]);

  useEffect(() => {
    if (entryKind !== "listening") return;
    if (!isListeningEmpty(listeningSections)) return;
    if (!body.trim()) return;
    const parsed = parseListeningBody(body);
    if (isListeningEmpty(parsed)) return;
    setListeningSections(parsed);
    lastSyncedListeningKey.current = JSON.stringify(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryKind]);

  useEffect(() => {
    if (entryKind !== "listening") return;
    const key = JSON.stringify(listeningSections);
    if (key === lastSyncedListeningKey.current) return;
    lastSyncedListeningKey.current = key;
    const composed = composeListeningBody(listeningSections);
    setBody(composed);
  }, [listeningSections, entryKind]);

  useEffect(() => {
    if (editId) return;
    const fromState = (location.state as { journalHandoff?: JournalExpandHandoffPayload } | null)
      ?.journalHandoff;
    let handoff: JournalExpandHandoffPayload | null = fromState ?? null;
    if (!handoff) {
      try {
        const raw = localStorage.getItem(JOURNAL_EXPAND_HANDOFF_KEY);
        if (raw) handoff = JSON.parse(raw) as JournalExpandHandoffPayload;
      } catch {
        /* ignore */
      }
    }
    if (!handoff || typeof handoff.body !== "string") return;
    if (handoffAppliedForKey.current === location.key) return;
    handoffAppliedForKey.current = location.key;

    setBody(handoff.body);
    if (handoff.title?.trim()) setTitle(handoff.title);
    if (handoff.tags?.length) setTags(handoff.tags);
    if (handoff.returnTo) setArtifactReturnTo(handoff.returnTo);
    try {
      localStorage.removeItem(JOURNAL_EXPAND_HANDOFF_KEY);
    } catch {
      /* ignore */
    }
    if (fromState) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
  }, [editId, location.key, location.pathname, location.search, location.state, navigate]);

  const loadChatTurns = useCallback(async (cId: string) => {
    setChatTurns(await loadInlineChatTurns(cId));
  }, []);

  useEffect(() => {
    setLoadedEditId(null);
    setEditLoadFailedId(null);
    if (!editId) return;
    setTitle("");
    setSummary("");
    setBody("");
    setMood(null);
    setTags([]);
    setEntryKind(null);
    setExistingPhotos([]);
    setChatId(null);
    setChatTurns([]);
  }, [editId]);

  useEffect(() => {
    if (!editId) return;
    setReplyWithAi(chatRequested);
  }, [chatRequested, editId]);

  useEffect(() => {
    const activeUserId = user?.id;
    if (!editId || !activeUserId) return;
    let cancelled = false;
    void (async () => {
      let entryHydrated = false;
      try {
      const data = await loadJournalDocumentRow(activeUserId, editId);
      if (cancelled) return;
      if (!data) throw new Error("This journal entry could not be found.");
      composePersistence.initialize(data);
      setLoadedEncrypted(data.e2e_encrypted);
      setTitle(data.title ?? "");
      setSummary((data as { summary?: string | null }).summary ?? "");
      const parsedBody = parseChatJournalEntry(data.body, (data as { summary?: string | null }).summary);
      const prose =
        parsedBody.kind === "plain" ? (data.body ?? "") : parsedBody.summary;
      setBody(prose);
      journalProseBeforeChatRef.current = prose;
      setMood(data.mood);
      setTags(data.tags ?? []);
      const loadedKind = coerceJournalEntryKind((data as { entry_kind?: string | null }).entry_kind);
      setEntryKind(loadedKind);
      if (loadedKind === "listening" || isListeningBody(data.body)) {
        const parsed = parseListeningBody(data.body);
        setListeningSections(parsed);
        lastSyncedListeningKey.current = JSON.stringify(parsed);
      }
      setVerseRef(data.verse_ref ?? "");
      setBeliefId(data.belief_id ?? "");
      setLocationName(data.location_name ?? "");
      setAnalyzeForMirror(!!data.analyze_for_mirror);
      setJournalId(data.journal_id ?? null);
      setLat(data.lat ?? null);
      setLng(data.lng ?? null);
      setWeather(data.weather ?? null);
      setWeatherTempC(data.weather_temp_c ?? null);
      setWeatherIcon(data.weather_icon ?? null);
      setChatId(null);
      setChatTurns([]);
      setExistingPhotos([]);
      const dt = new Date(data.entry_at_ts);
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      setEntryAt(dt.toISOString().slice(0, 16));

      setInlineEntryId(editId);
      setEditLoadFailedId(null);
      setLoadedEditId(editId);
      entryHydrated = true;
      const { data: chatRow } = await supabase
        .from("my_ai_chats")
        .select("id")
        .eq("journal_entry_id", editId)
        .eq("user_id", activeUserId)
        .maybeSingle();
      if (cancelled) return;
      if (chatRow?.id) {
        setChatId(chatRow.id);
        const turns = await loadInlineChatTurns(chatRow.id);
        if (cancelled) return;
        setChatTurns(turns);
      }

      const { data: photos } = await supabase
        .from("journal_photos")
        .select("id,storage_path")
        .eq("entry_id", editId);
      if (cancelled) return;
      const urls = await getSignedPhotoUrls((photos ?? []).map((p) => p.storage_path));
      if (cancelled) return;
      setExistingPhotos(
        (photos ?? []).map((p) => ({ id: p.id, storage_path: p.storage_path, url: urls[p.storage_path] })),
      );
      } catch (error) {
        if (cancelled) return;
        if (entryHydrated) {
          console.warn("[journal-entry] optional entry details failed to load", error);
          return;
        }
        setEditLoadFailedId(editId);
        toast({
          title: "Couldn't load this entry",
          description:
            error instanceof Error
              ? error.message
              : "Check your connection. Any video saved on this iPhone is still safe.",
          variant: "destructive",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, user?.id]);

  useEffect(() => {
    setPhotoSuggestionDismissed(false);
  }, [editId]);

  useEffect(() => {
    if (editId || !user) return;
    let cancelled = false;
    void (async () => {
      const draft = await restoreLocalDraft();
      if (!draft || cancelled) return;
      setTitle((value) => value.trim() ? value : draft.title);
      setBody((value) => value.trim() ? value : draft.body);
      if (draft.tags.length) setTags((value) => value.length ? value : draft.tags);
      if (draft.entryKind) setEntryKind(draft.entryKind);
      if (draft.listeningSections) setListeningSections(draft.listeningSections);
      const values = draft.values;
      if (values) {
        setSummary(String(values.summary ?? ""));
        setJournalId(values.journal_id as string | null);
        setMood(values.mood as number | null);
        setVerseRef(String(values.verse_ref ?? ""));
        setBeliefId(String(values.belief_id ?? ""));
        setPromptId(values.prompt_id as string | null);
        setLocationName(String(values.location_name ?? ""));
        setLat(values.lat as number | null);
        setLng(values.lng as number | null);
        setWeather(values.weather as string | null);
        setWeatherTempC(values.weather_temp_c as number | null);
        setWeatherIcon(values.weather_icon as string | null);
        setAnalyzeForMirror(Boolean(values.analyze_for_mirror));
        if (typeof values.entry_at_ts === "string") {
          const date = new Date(values.entry_at_ts);
          date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
          setEntryAt(date.toISOString().slice(0, 16));
        }
      }
    })().catch((error: unknown) => {
      if (!cancelled) toast({ title: "Draft recovery needs attention", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    });
    return () => { cancelled = true; };
  }, [editId, user?.id, restoreLocalDraft]);

  useEffect(() => {
    if (!user || inlineChatMode) return;
    if (editId && loadedEditId !== editId) return;
    if (!body.trim() && !title.trim() && !editId && !inlineEntryId) return;
    if (!editId && !inlineEntryId && !hasMeaningfulComposeContent({ title, body, entryKind, listeningSections })) return;
    scheduleComposePersist();
  }, [
    user,
    inlineChatMode,
    body,
    title,
    summary,
    tags,
    mood,
    entryKind,
    journalId,
    verseRef,
    beliefId,
    locationName,
    lat,
    lng,
    weather,
    weatherTempC,
    weatherIcon,
    analyzeForMirror,
    entryAt,
    listeningSections,
    editId,
    loadedEditId,
    inlineEntryId,
    scheduleComposePersist,
  ]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("belief_nodes")
      .select("id,topic,statement")
      .order("topic")
      .then(({ data }) => setBeliefs((data as BeliefOpt[]) ?? []));
  }, [user]);

  useEffect(() => {
    if (editId || !user) return;
    (async () => {
      if (!journalId) {
        const def = await getDefaultJournalId(user.id);
        if (def) setJournalId(def);
      }
      if (lat == null && !locationName) {
        const ctx = await getCurrentContext();
        if (ctx.lat != null) setLat(ctx.lat);
        if (ctx.lng != null) setLng(ctx.lng);
        if (ctx.location_name && !locationName) setLocationName(ctx.location_name);
        if (ctx.weather) setWeather(ctx.weather);
        if (ctx.weather_temp_c != null) setWeatherTempC(ctx.weather_temp_c);
        if (ctx.weather_icon) setWeatherIcon(ctx.weather_icon);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, user]);

  useEffect(() => {
    if (!journalId) return;
    supabase
      .from("journals")
      .select("name")
      .eq("id", journalId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setJournalName(data.name);
      });
  }, [journalId]);

  const activeEntryId = editId ?? inlineEntryId;
  useJournalPhotoRecovery(user?.id, activeEntryId, setExistingPhotos);
  const { videos, error: videoLoadError, reload: reloadVideos, remove: removeVideo } = useJournalEntryVideos(activeEntryId);

  const bodyMarkers = useJournalBodyMarkers({
    userId: user?.id,
    body,
    tags,
    onTagsChange: setTags,
    journalId,
    onJournalIdChange: setJournalId,
    enabled: !isListening && !inlineChatMode,
    onEntryKindChange: (kind) => setEntryKind(kind),
  });

  const handleBodyChange = useCallback(
    (value: string, cursor?: number) => {
      if (cursor != null) bodyCaretRef.current = cursor;
      setBody(value);
      bodyMarkers.syncMarkersFromBody(value);
      const pos = cursor ?? value.length;
      bodyMarkers.updateActiveMarker(value, pos);
    },
    [bodyMarkers],
  );

  const handleBodyKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (bodyMarkers.handleMarkerKeyDown(e)) {
        const el = e.currentTarget;
        handleBodyChange(el.value, el.selectionStart ?? el.value.length);
      }
    },
    [bodyMarkers, handleBodyChange],
  );

  const handleBodySelect = useCallback(
    (e: SyntheticEvent<HTMLTextAreaElement>) => {
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

  const bodyRef = useRef(body);
  bodyRef.current = body;

  const videoAutoTitle = useVideoJournalAutoTitle({
    title,
    setTitle,
    entryAt,
    entryId: editId ?? inlineEntryId,
    onSummary: setSummary,
    onSummarizingChange: setVideoSummarizing,
  });

  const listeningCanSave = useMemo(() => !isListeningEmpty(listeningSections), [listeningSections]);

  const dateLabel = useMemo(() => {
    try {
      const d = new Date(entryAt);
      const datePart = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return `${datePart}  ${timePart}`;
    } catch {
      return "Today";
    }
  }, [entryAt]);

  const lifeSegment = entryKind ? kindToLifeSegment(entryKind) : null;
  const layoutBack =
    artifactReturnTo ??
    (editId
      ? `/journal/${editId}`
      : entryKind === "vent"
        ? "/journal/vent"
        : lifeSegment
          ? `/journal/life/${lifeSegment}`
          : "/journal");
  const layoutTitle = editId ? "Edit entry" : entryKind ? `New ${ENTRY_KIND_META[entryKind].label}` : "New entry";
  const bodyPlaceholder = entryKind
    ? ENTRY_KIND_META[entryKind].placeholder
    : "Write something…";

  const { sketches: existingSketches, attachments: existingAttachments } =
    partitionJournalPhotos(existingPhotos);
  const pendingSketches = pendingFiles.filter((f) => isJournalSketchAsset(f.name));
  const pendingAttachments = pendingFiles.filter((f) => !isJournalSketchAsset(f.name));
  const hasJournalPhotos = existingAttachments.length > 0 || pendingAttachments.length > 0;
  const showPhotoSuggestion = useMemo(
    () =>
      !photoSuggestionDismissed &&
      !inlineChatMode &&
      !isListening &&
      !isVent &&
      shouldSuggestJournalPhotos({
        body,
        title,
        hasPhotos: hasJournalPhotos,
        entryKind,
      }),
    [
      body,
      title,
      hasJournalPhotos,
      entryKind,
      inlineChatMode,
      isListening,
      isVent,
      photoSuggestionDismissed,
    ],
  );
  const weatherLabel =
    weatherTempC != null ? `${Math.round((weatherTempC * 9) / 5 + 32)}\u00b0F` : (weather ?? "");

  void layoutTitle;
  void listeningCanSave;

  const setListeningSection = useCallback((key: ListeningSectionKey, value: string) => {
    setListeningSections((prev) => ({ ...prev, [key]: value }));
  }, []);

  const useSpiritQuestion = useCallback(
    (question: string) => {
      setListeningSections((prev) => ({
        ...prev,
        thought: mergeAskedQuestionIntoThought(prev.thought, question),
      }));
    },
    [],
  );

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not available", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
            { headers: { Accept: "application/json" } },
          );
          const j = await r.json();
          const name =
            j?.address?.city ||
            j?.address?.town ||
            j?.address?.village ||
            j?.address?.county ||
            j?.display_name?.split(",")[0] ||
            `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          setLocationName(name);
        } catch {
          setLocationName(`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
        }
      },
      () => toast({ title: "Couldn't get location", variant: "destructive" }),
      { timeout: 8000 },
    );
  }, []);

  const removeExistingPhoto = useCallback(async (photoId: string, _storagePath: string) => {
    const id = editId ?? inlineEntryId;
    if (!user?.id || !id) return;
    try {
      await removeJournalAttachment(user.id, id, photoId, "journal_photos");
      setExistingPhotos((photos) => photos.filter((photo) => photo.id !== photoId));
    } catch (error) {
      toast({ title: "Photo removal needs attention", description: error instanceof Error ? error.message : "Retry removal.", variant: "destructive" });
    }
  }, [editId, inlineEntryId, user?.id]);

  const ensureChatEntry = useCallback(async (): Promise<{ entryId: string; chatId: string } | null> => {
    if (!user || !cloudAiAllowed) return null;
    let eId = inlineEntryId ?? editId ?? null;
    let cId = chatId;
    const ts = new Date(entryAt);

    if (!eId) {
      eId = await composePersistence.ensureEntry();
      if (!eId) return null;
    }

    await requireJournalCloudAi(eId, user.id);
    if (!cId) {
      const { data: existing } = await supabase
        .from("my_ai_chats")
        .select("id")
        .eq("journal_entry_id", eId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.id) {
        cId = existing.id;
      } else {
        const { data: created, error: cErr } = await supabase
          .from("my_ai_chats")
          .insert({ user_id: user.id, journal_entry_id: eId, title: title.trim() || null })
          .select("id")
          .maybeSingle();
        if (cErr || !created) {
          toast({ title: "Couldn't start AI chat", description: cErr?.message, variant: "destructive" });
          return null;
        }
        cId = created.id;
      }
      setChatId(cId);
    }
    return { entryId: eId!, chatId: cId! };
  }, [
    cloudAiAllowed,
    user,
    inlineEntryId,
    editId,
    chatId,
    entryAt,
    journalId,
    title,
    mood,
    tags,
    verseRef,
    beliefId,
    promptId,
    locationName,
    lat,
    lng,
    weather,
    weatherTempC,
    weatherIcon,
  ]);

  const sendToAi = useCallback(async () => {
    const text = body.trim();
    if (!text || aiBusy || !cloudAiAllowed) return;
    dictateRef.current?.stop();
    assistantTtsRef.current.stop();
    setAiBusy(true);
    const userTempId = `tmp-user-${Date.now()}`;
    const assistantTempId = `tmp-asst-${Date.now()}`;
    setStreamingAssistantId(assistantTempId);
    setChatTurns((prev) => [
      ...prev,
      { id: userTempId, role: "user", content: text },
      { id: assistantTempId, role: "assistant", content: "" },
    ]);
    setBody("");
    let ensured: { entryId: string; chatId: string } | null = null;
    abortAiRef.current?.abort();
    abortAiRef.current = new AbortController();
    try {
      ensured = await ensureChatEntry();
      if (!ensured) {
        setBody((current) => current || text);
        setChatTurns((prev) => prev.filter((t) => !t.id.startsWith("tmp-")));
        return;
      }
      await requireJournalCloudAi(ensured.entryId, user?.id);
      const done = await streamMyAiChat({
        signal: abortAiRef.current.signal,
        body: {
          chat_id: ensured.chatId,
          message: text,
          mode: "journal",
          journal_entry_id: ensured.entryId,
          include_general_knowledge: includeGeneral,
          response_depth: responseDepth,
        },
        onDelta: (acc) => {
          setChatTurns((prev) =>
            prev.map((t) => (t.id === assistantTempId ? { ...t, content: acc } : t)),
          );
        },
      });
      await loadChatTurns(ensured.chatId);
      if (done.content.trim()) void assistantTtsRef.current.play(done.content);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        const cId = ensured?.chatId ?? chatId;
        if (cId) await loadChatTurns(cId);
        return;
      }
      toast({ title: "AI reply failed", description: String(e), variant: "destructive" });
      setBody((b) => (b ? b : text));
      setChatTurns((prev) => prev.filter((t) => !t.id.startsWith("tmp-")));
    } finally {
      abortAiRef.current = null;
      setStreamingAssistantId(null);
      setAiBusy(false);
    }
  }, [body, aiBusy, ensureChatEntry, loadChatTurns, includeGeneral, responseDepth, chatId, cloudAiAllowed, user?.id]);

  const stopAiReply = useCallback(() => {
    abortAiRef.current?.abort();
    abortAiRef.current = null;
    assistantTtsRef.current.stop();
    setStreamingAssistantId(null);
    setAiBusy(false);
  }, []);

  const retryLastAiReply = useCallback(async () => {
    const entryId = editId ?? inlineEntryId;
    if (!entryId || !chatId || aiBusy || !cloudAiAllowed) return;
    if (!chatTurns.some((turn) => turn.role === "assistant")) return;
    assistantTtsRef.current.stop();
    dictateRef.current?.stop();
    setAiBusy(true);
    const assistantTempId = `tmp-retry-${Date.now()}`;
    setStreamingAssistantId(assistantTempId);
    setChatTurns((prev) => {
      let lastAssistantIdx = -1;
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i].role === "assistant") {
          lastAssistantIdx = i;
          break;
        }
      }
      if (lastAssistantIdx < 0) return prev;
      return [...prev.slice(0, lastAssistantIdx), { id: assistantTempId, role: "assistant", content: "" }];
    });
    abortAiRef.current?.abort();
    abortAiRef.current = new AbortController();
    try {
      await requireJournalCloudAi(entryId, user?.id);
      const done = await streamMyAiChat({
        signal: abortAiRef.current.signal,
        body: {
          chat_id: chatId,
          retry_last: true,
          mode: "journal",
          journal_entry_id: entryId,
          include_general_knowledge: includeGeneral,
          response_depth: responseDepth,
        },
        onDelta: (acc) => {
          setChatTurns((prev) =>
            prev.map((t) => (t.id === assistantTempId ? { ...t, content: acc } : t)),
          );
        },
      });
      await loadChatTurns(chatId);
      if (done.content.trim()) void assistantTtsRef.current.play(done.content);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast({ title: "Retry failed", description: String(e), variant: "destructive" });
      }
      await loadChatTurns(chatId);
    } finally {
      abortAiRef.current = null;
      setStreamingAssistantId(null);
      setAiBusy(false);
    }
  }, [editId, inlineEntryId, chatId, aiBusy, chatTurns, includeGeneral, responseDepth, loadChatTurns, cloudAiAllowed, user?.id]);

  const save = useCallback(async () => {
    if (!user || manualSaveRef.current) return;
    dictateRef.current?.stop();
    const hasChat = chatTurns.length > 0;
    if (!body.trim() && !title.trim() && !pendingFiles.length && !existingPhotos.length && !hasChat && !editId && !inlineEntryId) {
      toast({ title: "Write something or add a photo first", variant: "destructive" });
      return;
    }
    manualSaveRef.current = true;
    setBusy(true);
    setBusyLabel("Saving");
    try {
    const isInlineChat = hasChat && (inlineChatMode || entryKind === "chat");
    const result = await flushComposeSave({
      patch: isInlineChat ? { body: composeChatTranscript(chatTurns, body), entry_kind: "chat" } : undefined,
    });
    if (!result.ok) return;
    const entryId = result.entryId;
    const composedBody = String(result.snapshot.values.body ?? "");

    if (entryId && composedBody.includes("[[")) {
      await syncEntryWikilinks(user.id, entryId, composedBody);
    }

    const hasPendingSketchUpload = pendingFiles.some((file) => isJournalSketchAsset(file.name));
    if (pendingFiles.length && entryId) {
      setBusyLabel("Uploading photos");
      try {
        await attachJournalPhotos(user.id, entryId, pendingFiles);
        setPendingFiles((files) => files.filter((file) => !pendingFiles.includes(file)));
        const { data: photoRows } = await supabase
          .from("journal_photos")
          .select("storage_path")
          .eq("entry_id", entryId!);
        const { sketches } = partitionJournalPhotos(photoRows ?? []);
        if (sketches.length) {
          setBusyLabel("Reading handwriting");
          const tx = await transcribeEntrySketchPaths(
            entryId!,
            sketches.map((s) => s.storage_path),
          );
          if (!tx.ok) {
            toast({
              title: "Photos saved",
              description: tx.error,
              variant: "destructive",
            });
          } else if (tx.transcribed > 0 || tx.title) {
            const refreshed = await refreshJournalDocument(user.id, entryId!);
            toast({
              title: tx.title || refreshed?.title ? "Entry named and transcribed" : "Handwritten note transcribed",
              description:
                tx.title || refreshed?.title
                  ? `"${tx.title ?? refreshed?.title}" — ${refreshed?.summary ? "summary and full text" : "full text"} added.`
                  : refreshed?.summary
                    ? "Summary and full text were added to your entry."
                    : "Handwriting was added to your journal body.",
            });
          }
        }
        if (hasPendingSketchUpload) {
          await clearStoredPendingSketch();
        }
      } catch (e) {
        toast({
          title: hasPendingSketchUpload ? "Handwritten upload failed" : "Photo upload failed",
          description: hasPendingSketchUpload
            ? "Your handwritten note is still saved on this device. Try Done again."
            : String(e),
          variant: "destructive",
        });
        setBusy(false);
        return;
      }
    }

    if (analyzeForMirror && entryId) {
      supabase.functions
        .invoke("journal-score-entry", { body: { entry_id: entryId } })
        .catch((e) => console.error("score err", e));
    }

    const finalSave = await flushComposeSave();
    if (!finalSave.ok) return;
    clearComposeDraft();

    if (isInlineChat) {
      navigate(`/journal/${entryId}`);
      return;
    }

    if (replyWithAi && canReplyWithAi && entryId) {
      setBusyLabel("Opening AI reply");
      try {
        await supabase
          .from("journal_entries")
          .update({ entry_kind: "chat" })
          .eq("id", entryId)
          .eq("user_id", user.id);
        const { data: existing } = await supabase
          .from("my_ai_chats")
          .select("id")
          .eq("journal_entry_id", entryId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!existing?.id) {
          await supabase
            .from("my_ai_chats")
            .insert({ user_id: user.id, journal_entry_id: entryId, title: title.trim() || null });
        }
      } catch (e) {
        toast({ title: "Couldn't open AI reply", description: String(e), variant: "destructive" });
      }
      navigate(`/journal/${entryId}/edit?chat=1`);
      return;
    }

    if (artifactReturnTo === "/journal/notes") {
      navigate(artifactReturnTo);
      return;
    }

    navigate(`/journal/${entryId}`);
    } catch (error) {
      toast({ title: "Save needs attention", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      manualSaveRef.current = false;
      setBusy(false);
    }
  }, [
    user,
    chatTurns,
    body,
    title,
    summary,
    pendingFiles,
    existingPhotos,
    entryAt,
    inlineEntryId,
    entryKind,
    journalId,
    mood,
    tags,
    verseRef,
    beliefId,
    promptId,
    locationName,
    lat,
    lng,
    weather,
    weatherTempC,
    weatherIcon,
    analyzeForMirror,
    editId,
    replyWithAi,
    canReplyWithAi,
    navigate,
    flushComposeSave,
    clearComposeDraft,
    clearStoredPendingSketch,
    artifactReturnTo,
  ]);

  const openChatMode = useCallback(async () => {
    if (!canReplyWithAi) {
      toast({ title: "Not available for this entry type" });
      return;
    }
    if (chatTurns.length === 0 && body.trim()) {
      journalProseBeforeChatRef.current = body;
      setBody("");
    }
    setReplyWithAi(true);
    await ensureChatEntry();
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, [canReplyWithAi, ensureChatEntry, chatTurns.length, body]);

  const exitChatMode = useCallback(() => {
    setReplyWithAi(false);
    setBody((cur) => cur.trim() || journalProseBeforeChatRef.current || cur);
  }, []);

  const handleCaretChange = useCallback((offset: number) => {
    bodyCaretRef.current = offset;
  }, []);

  const triggerPhotos = useCallback(() => photoInputRef.current?.click(), []);
  const triggerCamera = useCallback(() => photoCameraInputRef.current?.click(), []);
  const dismissPhotoSuggestion = useCallback(() => setPhotoSuggestionDismissed(true), []);
  const triggerAudio = useCallback(() => dictateRef.current?.toggle(), []);
  const triggerPrompts = useCallback(() => navigate("/journal/prompts"), [navigate]);
  const triggerHandwritten = useCallback(() => setSketchOpen(true), []);

  const focusBodyEditor = useCallback(() => {
    composerLockScrollYRef.current = window.scrollY;
    const el = bodyTextareaRef.current;
    if (!el) return;
    resizeJournalTextarea(el);
    el.focus();
    const pos = el.value.length;
    el.setSelectionRange(pos, pos);
    requestAnimationFrame(() => scrollToCaretEnd());
  }, [scrollToCaretEnd]);
  focusBodyEditorRef.current = focusBodyEditor;

  const { onListeningChange: formatAfterDictation, formatting: dictationFormatting } =
    useDictationAutoFormat({
      enabled: !isVent && !inlineChatMode,
      getBody: () => bodyRef.current,
      setBody: (next) => handleBodyChange(next),
      onFormatted: () => focusBodyEditorRef.current(),
    });
  const onDictationListeningChange = useCallback(
    (listening: boolean) => {
      setDictating(listening);
      formatAfterDictation(listening);
    },
    [formatAfterDictation],
  );

  const appendDictatedText = useCallback((chunk: string) => {
    setBody((b) => {
      const next = mergeDictatedText(b, chunk);
      bodyCaretRef.current = next.length;
      requestAnimationFrame(() => {
        bodyMarkers.syncMarkersFromBody(next);
        bodyMarkers.updateActiveMarker(next, next.length);
      });
      return next;
    });
    requestAnimationFrame(() => scrollToCaretEnd());
  }, [bodyMarkers, scrollToCaretEnd]);

  const insertAtCursor = useCallback(
    (before: string, after = "", placeholder = "") => {
      const el = bodyTextareaRef.current;
      const cur = bodyRef.current;
      const start = el?.selectionStart ?? cur.length;
      const end = el?.selectionEnd ?? start;
      const sel = cur.slice(start, end) || placeholder;
      const next = cur.slice(0, start) + before + sel + after + cur.slice(end);
      const cursor = start + before.length + sel.length;
      handleBodyChange(next, cursor);
      requestAnimationFrame(() => {
        const ta = bodyTextareaRef.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(cursor, cursor);
      });
    },
    [handleBodyChange],
  );

  const getVideoAnchorOffset = useCallback(() => {
    const cur = bodyRef.current;
    const el = bodyTextareaRef.current;
    const editorFocused = Boolean(el && document.activeElement === el);
    const caret = editorFocused ? (el!.selectionStart ?? bodyCaretRef.current) : bodyCaretRef.current;
    return resolveVideoAnchorOffset(cur, { caret, bodyEditorFocused: editorFocused });
  }, []);

  const handleVideoRecordingStart = useCallback(() => {
    if (!cloudAiAllowed) { videoLiveSnapRef.current = null; return; }
    const snap = {
      body: bodyRef.current,
      anchor: Math.max(0, Math.min(videoAnchorRef.current, bodyRef.current.length)),
    };
    videoLiveSnapRef.current = snap;
    startVideoCaption(snap.body, snap.anchor);
    const entryId = editId ?? inlineEntryId;
    if (entryId) {
      updateJournalVideoRecordingBodySnapForEntry(entryId, snap.body, snap.anchor);
    }
    videoAutoTitle.onRecordingStart();
  }, [cloudAiAllowed, videoAutoTitle, editId, inlineEntryId, startVideoCaption]);

  const handleVideoRecordingCancelled = useCallback(() => {
    clearVideoCaption();
    videoLiveSnapRef.current = null;
  }, [clearVideoCaption]);

  const ensureDraftEntry = composePersistence.ensureEntry;

  const openNativeDraftVideo = useCallback((ownerId: string) => {
    videoAnchorRef.current = getVideoAnchorOffset();
    setNativeVideoDraftOwnerId(ownerId);
    setVideoOpen(true);
  }, [getVideoAnchorOffset]);

  const triggerVideo = useCallback(async () => {
    if (!journalVideoCaptureSupported()) {
      toast({ title: "Video isn't supported in this browser", variant: "destructive" });
      return;
    }
    videoAnchorRef.current = getVideoAnchorOffset();
    if (nativeJournalVideoCaptureSupported() && !editId && !inlineEntryId) {
      openNativeDraftVideo(
        nativeVideoDraftOwnerId ?? createNativeJournalVideoDraftOwnerId(),
      );
      return;
    }
    const entryId = await ensureDraftEntry();
    if (entryId) setVideoOpen(true);
  }, [
    editId,
    ensureDraftEntry,
    getVideoAnchorOffset,
    inlineEntryId,
    nativeVideoDraftOwnerId,
    openNativeDraftVideo,
  ]);

  useEffect(() => {
    const resumeVideo = params.get("resumeVideo") === "1";
    const captureAction = params.get("capture");
    const requestedNativeOwner = params.get("nativeVideoOwner");
    const nativeDraftOwner = isNativeJournalVideoDraftOwnerId(requestedNativeOwner)
      ? requestedNativeOwner
      : null;
    const requestedAction = resumeVideo || captureAction === "video" || captureAction === "dictate";
    if (!requestedAction) {
      captureRequestHandledRef.current = false;
      return;
    }
    if (
      captureRequestHandledRef.current ||
      loading ||
      !user?.id ||
      (resumeVideo && !editId && !nativeDraftOwner) ||
      (editId != null &&
        loadedEditId !== editId &&
        !(resumeVideo && editLoadFailedId === editId))
    ) {
      return;
    }
    captureRequestHandledRef.current = true;
    const nextParams = new URLSearchParams(params);
    nextParams.delete("resumeVideo");
    nextParams.delete("capture");
    nextParams.delete("nativeVideoOwner");
    const nextSearch = nextParams.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true },
    );
    if (resumeVideo || captureAction === "video") {
      if (nativeDraftOwner && nativeJournalVideoCaptureSupported()) {
        openNativeDraftVideo(nativeDraftOwner);
      } else {
        void triggerVideo();
      }
    } else {
      window.requestAnimationFrame(() => dictateRef.current?.toggle());
    }
  }, [
    editId,
    editLoadFailedId,
    loadedEditId,
    loading,
    location.pathname,
    navigate,
    openNativeDraftVideo,
    params,
    triggerVideo,
    user?.id,
  ]);

  const handleVideoComplete = useCallback(
    async (result: JournalVideoCaptureResult, durationMs: number) => {
      if (!user?.id) {
        throw new Error("Sign in again to attach this recording. It remains safe on this iPhone.");
      }
      const entryId = editId ?? inlineEntryId ?? await ensureDraftEntry();
      if (!entryId) {
        throw new Error(
          "Your recording is safe on this iPhone. Connect to the internet, then tap Save video again.",
        );
      }
      const anchorOffset = videoAnchorRef.current;
      const recordedMs = result.durationMs || durationMs;
      setVideoUploading(true);
      try {
        const { saved, queued } = await saveJournalVideoCaptureWithQueue({
          userId: user.id,
          entryId,
          result,
          durationMs: recordedMs,
          anchorOffset,
          bodySnap: videoLiveSnapRef.current,
          deferUpload: true,
        });

        if (saved.status === "queued") {
          // The queue owns the media and local document owns the caption preview now.
          videoLiveSnapRef.current = null;
          clearVideoCaption();
          setVideoOpen(false);
          setNativeVideoDraftOwnerId(null);
          return;
        }
        setVideoUploading(false);
        setVideoTranscribing(true);

        const snap = videoLiveSnapRef.current;
        const best = resolveVideoJournalTranscript({
          serverTranscript: saved.transcript,
          liveTranscript: saved.liveTranscript,
          peakLiveTranscript: saved.peakLiveTranscript,
          snap,
          body: bodyRef.current,
        });

        await reloadVideos();
        const refreshed = await refreshJournalDocument(user.id, entryId);
        const enrichResult = !journalCloudAiAllowed(refreshed) ? undefined : await videoAutoTitle.onRecordingComplete(refreshed.body);
        videoLiveSnapRef.current = null;
        clearVideoCaption();

        if (queued) {
          toast({
            title: "Upload delayed",
            description:
              "Your recording is safe on this device. We'll upload and finish the transcript automatically.",
          });
        } else {
          toast({
            title: best ? "Video and transcript saved" : "Video saved",
            description: best
              ? enrichResult && enrichResult.summary
                ? "Summary and full transcript are in your entry."
                : undefined
              : journalVideoTranscriptEmptyMessage({
                  sttError: saved.sttError,
                  hadLiveCaption: Boolean(
                    result.liveTranscript.trim() || result.peakLiveTranscript.trim(),
                  ),
                  hadAudioSidecar: Boolean(result.audio && result.audio.size > 0),
                }),
          });
        }
        setVideoOpen(false);
        setNativeVideoDraftOwnerId(null);
      } catch (e) {
        toast({
          title: "Couldn't save video",
          description: e instanceof Error ? e.message : "Please try again.",
          variant: "destructive",
        });
        throw e;
      } finally {
        setVideoUploading(false);
        setVideoTranscribing(false);
      }
    },
    [
      user?.id,
      editId,
      inlineEntryId,
      ensureDraftEntry,
      clearVideoCaption,
      reloadVideos,
      handleBodyChange,
      videoAutoTitle,
    ],
  );

  useEffect(() => {
    const entryId = editId ?? inlineEntryId;
    if (!entryId) return;
    const onVideoSaved = (event: Event) => {
      const detail = (event as CustomEvent<JournalVideoSavedEventDetail>).detail;
      if (!detail?.entryId || detail.entryId !== entryId) return;
      if (bodyRef.current === detail.body) return;
      // The shared document subscription reconciles this event with pending typing.
      void refreshJournalDocument(user!.id, entryId).catch(() => {});
    };
    window.addEventListener(JOURNAL_VIDEO_SAVED_EVENT, onVideoSaved);
    return () => window.removeEventListener(JOURNAL_VIDEO_SAVED_EVENT, onVideoSaved);
  }, [editId, inlineEntryId]);

  const scoreNow = useCallback(async () => {
    const entryId = editId ?? inlineEntryId;
    if (!entryId) {
      toast({ title: "Save the entry first" });
      return;
    }
    setScoring(true);
    const { error } = await supabase.functions.invoke("journal-score-entry", {
      body: { entry_id: entryId },
    });
    setScoring(false);
    if (error) {
      toast({ title: "Couldn't score", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Entry scored" });
  }, [editId, inlineEntryId]);

  const handlePhotoInputChange = useCallback((files: FileList | null) => {
    addPendingFiles(Array.from(files ?? []));
  }, [addPendingFiles]);

  const handleSketchAutosave = useCallback(
    async (file: File) => {
      if (!editId || !user) return;
      const r = await autosaveSketchPhoto(user.id, editId, file);
      const urls = await getSignedPhotoUrls([r.storage_path]);
      setExistingPhotos((prev) => {
        const rest = prev.filter((p) => p.storage_path !== r.storage_path);
        return [
          ...rest,
          {
            id: r.photo_id ?? `sketch-${editId}`,
            storage_path: r.storage_path,
            url: urls[r.storage_path],
          },
        ];
      });
      setPendingFiles((arr) => arr.filter((f) => !isJournalSketchAsset(f.name)));
    },
    [editId, user],
  );

  const handleSketchSave = useCallback(
    async (file: File) => {
      if (editId && user) {
        toast({
          title: "Reading your handwritten note…",
          description: "AI is transcribing your handwriting.",
        });
        const r = await upsertSketchAndTranscribe(user.id, editId, file);
        const urls = await getSignedPhotoUrls([r.storage_path]);
        setExistingPhotos((prev) => {
          const rest = prev.filter((p) => p.storage_path !== r.storage_path);
          return [
            ...rest,
            {
              id: r.photo_id ?? `sketch-${editId}`,
              storage_path: r.storage_path,
              url: urls[r.storage_path],
            },
          ];
        });
        setPendingFiles((arr) => arr.filter((f) => !isJournalSketchAsset(f.name)));
        if (!r.ok) {
          toast({
            title: "Transcription failed",
            description: r.error ?? "Your sketch was saved — try again.",
            variant: "destructive",
          });
          return;
        }
        if (r.skipped) {
          toast({ title: "Handwritten note saved" });
          return;
        }
        await refreshJournalDocument(user.id, editId);
        toast({
          title: r.title ? "Entry named and transcribed" : "Handwritten note transcribed",
          description: r.title
            ? `"${r.title}" — ${r.summary ? "summary and full text" : "text"} added to your entry.`
            : r.summary
              ? "Summary and full text were added to your entry."
              : "Text was added to your journal body.",
        });
        return;
      }
      await savePendingSketchFile(file);
    },
    [editId, user, savePendingSketchFile],
  );

  const handleSketchUnsavedExit = useCallback(async (file: File) => {
    await savePendingSketchFile(file);
    toast({
      title: "Handwritten note kept",
      description: "Save your entry to attach it to your journal.",
    });
  }, [savePendingSketchFile]);

  return {
    cloudAiAllowed,
    lat, lng, journalId,
    videoCaptionPreview,
    user,
    loading,
    editId,
    entryHydrating: Boolean(editId && loadedEditId !== editId),
    entryLoadFailed: Boolean(editId && editLoadFailedId === editId),
    activeEntryId,
    nativeVideoDraftOwnerId,
    navigate,
    kbInset,
    keyboardOpen,
    vvOffsetTop,
    viewportHeight,
    inMiniPhone,
    isMobile,
    bodyFocused,
    setBodyFocused,
    bodyTextareaRef,
    focusBodyEditor,
    title,
    setTitle,
    summary,
    setSummary,
    markTitleEdited: videoAutoTitle.markTitleEdited,
    body,
    setBody,
    mood,
    setMood,
    tags,
    setTags,
    entryKind,
    setEntryKind,
    entryAt,
    setEntryAt,
    verseRef,
    setVerseRef,
    beliefId,
    setBeliefId,
    beliefs,
    locationName,
    setLocationName,
    analyzeForMirror,
    setAnalyzeForMirror,
    replyWithAi,
    setReplyWithAi,
    includeGeneral,
    setIncludeGeneral,
    voiceReplies,
    setVoiceReplies,
    responseDepth,
    setResponseDepth,
    chatId,
    busy,
    chatTurns,
    aiBusy,
    streamingAssistantId,
    dictInterim,
    setDictInterim,
    sketchOpen,
    setSketchOpen,
    moreOpen,
    setMoreOpen,
    dateOpen,
    setDateOpen,
    journalName,
    composerFocused,
    setComposerFocused,
    listeningSections,
    setListeningSection,
    useSpiritQuestion,
    chatScrollRef,
    chatBottomRef,
    dictateRef,
    composerLockScrollYRef,
    photoInputRef,
    photoCameraInputRef,
    mainScrollRef,
    bottomDockRef,
    dateLabel,
    layoutBack,
    bodyPlaceholder,
    isVent,
    isListening,
    canReplyWithAi,
    inlineChatMode,
    weatherLabel,
    existingSketches,
    existingAttachments,
    pendingSketches,
    pendingAttachments,
    sketchDraftKey,
    save,
    sendToAi,
    stopAiReply,
    retryLastAiReply,
    openChatMode,
    exitChatMode,
    triggerPhotos,
    triggerCamera,
    dismissPhotoSuggestion,
    showPhotoSuggestion,
    triggerAudio,
    triggerPrompts,
    triggerHandwritten,
    triggerVideo,
    insertAtCursor,
    scoreNow,
    scoring,
    videos,
    videoLoadError,
    reloadVideos,
    removeVideo,
    videoOpen,
    setVideoOpen,
    videoUploading,
    videoTranscribing,
    videoSummarizing,
    handleVideoComplete,
    handleVideoRecordingStart,
    handleVideoLiveTranscript,
    handleVideoRecordingCancelled,
    videoCaptureSupported: journalVideoCaptureSupported(),
    videoAnchorRef,
    handleCaretChange,
    removeExistingPhoto,
    removePendingFile,
    useMyLocation,
    appendDictatedText,
    onDictationListeningChange,
    dictating,
    dictationFormatting,
    handlePhotoInputChange,
    handleSketchAutosave,
    handleSketchSave,
    handleSketchUnsavedExit,
    handleBodyChange,
    handleBodyKeyDown,
    handleBodySelect,
    handleMarkerPick,
    handleTagsManualChange: bodyMarkers.handleTagsManualChange,
    markerMenu: {
      marker: bodyMarkers.activeMarker,
      suggestions: bodyMarkers.suggestions,
      activeIndex: bodyMarkers.menuIndex,
      setActiveIndex: bodyMarkers.setMenuIndex,
      dismiss: bodyMarkers.dismissMarkerMenu,
    },
  };
}
