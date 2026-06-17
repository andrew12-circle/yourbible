import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { DictateButtonHandle } from "@/components/journal/DictateButton";
import { partitionJournalPhotos } from "@/components/journal/JournalSketchInline";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { uploadEntryPhotos, getSignedPhotoUrls } from "@/lib/journal/photos";
import { autosaveSketchPhoto, isJournalSketchAsset } from "@/lib/journal/sketchPhotos";
import {
  transcribeEntrySketchPaths,
  upsertSketchAndTranscribe,
} from "@/lib/journal/sketchTranscription";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { mergeInlineTags } from "@/lib/journal/inlineMarkers";
import {
  JOURNAL_RESPONSE_DEPTH_STORAGE_KEY,
  persistResponseDepthSetting,
  readResponseDepthSetting,
  type ResponseDepthSetting,
} from "@/lib/journal/responseDepth";
import {
  persistJournalChatIncludeGeneral,
  readJournalChatIncludeGeneralDefault,
} from "@/lib/journal/chatComposerSettings";
import { getCurrentContext } from "@/lib/journal/context";
import { useJournalEditorCaretScroll } from "@/hooks/useJournalEditorCaretScroll";
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
import { useJournalBodyMarkers } from "@/hooks/useJournalBodyMarkers";

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
  const { keyboardInset: kbInset, offsetTop: vvOffsetTop } = useVisualViewportMetrics();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
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

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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
  const [dictInterim, setDictInterim] = useState("");
  const [sketchOpen, setSketchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [journalName, setJournalName] = useState<string>("Journal");
  const [composerFocused, setComposerFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);
  const composerLockScrollYRef = useRef<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const bottomDockRef = useRef<HTMLElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  const isVent = entryKind === "vent";
  const isListening = entryKind === "listening";
  const canReplyWithAi = !isVent && !isListening;
  const inlineChatMode = replyWithAi && canReplyWithAi;

  useLockBodyScrollWhenKeyboardActive(
    (inlineChatMode && composerFocused) || bodyFocused,
    composerLockScrollYRef,
  );

  useEffect(() => {
    persistJournalChatIncludeGeneral(includeGeneral);
  }, [includeGeneral]);

  useEffect(() => {
    persistResponseDepthSetting(JOURNAL_RESPONSE_DEPTH_STORAGE_KEY, responseDepth);
  }, [responseDepth]);

  const { scrollCaretIntoView } = useJournalEditorCaretScroll({
    scrollRef: mainScrollRef,
    bottomDockRef: bodyFocused ? undefined : bottomDockRef,
    kbInset,
    enabled: !inlineChatMode,
    fixedBottomInsetPx: bodyFocused ? kbInset + 16 : undefined,
    topInsetPx: vvOffsetTop > 0 ? vvOffsetTop + 72 : 16,
  });

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
    if (!editId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", editId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) return;
      setTitle(data.title ?? "");
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
      const dt = new Date(data.entry_at_ts);
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
      setEntryAt(dt.toISOString().slice(0, 16));

      setInlineEntryId(editId);
      const { data: chatRow } = await supabase
        .from("my_ai_chats")
        .select("id")
        .eq("journal_entry_id", editId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (chatRow?.id) {
        setChatId(chatRow.id);
        await loadChatTurns(chatRow.id);
      }
      if (loadedKind === "chat") {
        setReplyWithAi(true);
      }

      const { data: photos } = await supabase
        .from("journal_photos")
        .select("id,storage_path")
        .eq("entry_id", editId);
      const urls = await getSignedPhotoUrls((photos ?? []).map((p) => p.storage_path));
      setExistingPhotos(
        (photos ?? []).map((p) => ({ id: p.id, storage_path: p.storage_path, url: urls[p.storage_path] })),
      );
    })();
  }, [editId, user, loadChatTurns]);

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

  const bodyMarkers = useJournalBodyMarkers({
    userId: user?.id,
    body,
    tags,
    onTagsChange: setTags,
    journalId,
    onJournalIdChange: setJournalId,
    enabled: !isListening && !inlineChatMode,
  });

  const handleBodyChange = useCallback(
    (value: string, cursor?: number) => {
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
      bodyMarkers.updateActiveMarker(el.value, el.selectionStart ?? el.value.length);
    },
    [bodyMarkers],
  );

  const handleMarkerPick = useCallback(
    (label: string) => {
      const next = bodyMarkers.pickSuggestion(label);
      if (next) handleBodyChange(next.text, next.cursor);
    },
    [bodyMarkers, handleBodyChange],
  );

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
    : "What happened today? Type #tag or @journal name to organize.";

  const { sketches: existingSketches, attachments: existingAttachments } =
    partitionJournalPhotos(existingPhotos);
  const pendingSketches = pendingFiles.filter((f) => isJournalSketchAsset(f.name));
  const pendingAttachments = pendingFiles.filter((f) => !isJournalSketchAsset(f.name));
  const sketchDraftKey = `compose:${editId ?? journalId ?? "new"}`;

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

  const removeExistingPhoto = useCallback(async (photoId: string, storage_path: string) => {
    setExistingPhotos((ps) => ps.filter((p) => p.id !== photoId));
    await supabase.storage.from("journal-photos").remove([storage_path]).catch(() => {});
    await supabase.from("journal_photos").delete().eq("id", photoId);
  }, []);

  const ensureChatEntry = useCallback(async (): Promise<{ entryId: string; chatId: string } | null> => {
    if (!user) return null;
    let eId = inlineEntryId ?? editId ?? null;
    let cId = chatId;
    const ts = new Date(entryAt);

    if (!eId) {
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          journal_id: journalId,
          title: title.trim() || null,
          body: "",
          mood,
          tags,
          verse_ref: verseRef.trim() || null,
          belief_id: beliefId || null,
          prompt_id: promptId,
          location_name: locationName.trim() || null,
          lat,
          lng,
          weather,
          weather_temp_c: weatherTempC,
          weather_icon: weatherIcon,
          analyze_for_mirror: false,
          entry_at_ts: ts.toISOString(),
          entry_at: ts.toISOString().slice(0, 10),
          entry_kind: "chat",
        })
        .select("id")
        .maybeSingle();
      if (error || !data) {
        toast({ title: "Couldn't start AI chat", description: error?.message, variant: "destructive" });
        return null;
      }
      eId = data.id;
      setInlineEntryId(eId);
    } else if (editId) {
      await supabase
        .from("journal_entries")
        .update({ entry_kind: "chat" })
        .eq("id", eId)
        .eq("user_id", user.id);
    }

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
    if (!text || aiBusy) return;
    dictateRef.current?.stop();
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
    try {
      const ensured = await ensureChatEntry();
      if (!ensured) {
        setChatTurns((prev) => prev.filter((t) => !t.id.startsWith("tmp-")));
        return;
      }
      await streamMyAiChat({
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
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (e) {
      toast({ title: "AI reply failed", description: String(e), variant: "destructive" });
      setBody((b) => (b ? b : text));
      setChatTurns((prev) => prev.filter((t) => !t.id.startsWith("tmp-")));
    } finally {
      setStreamingAssistantId(null);
      setAiBusy(false);
    }
  }, [body, aiBusy, ensureChatEntry, loadChatTurns, includeGeneral, responseDepth]);

  const save = useCallback(async () => {
    if (!user) return;
    dictateRef.current?.stop();
    const hasChat = chatTurns.length > 0;
    if (!body.trim() && !title.trim() && !pendingFiles.length && !existingPhotos.length && !hasChat) {
      toast({ title: "Write something or add a photo first", variant: "destructive" });
      return;
    }
    setBusy(true);
    setBusyLabel("Saving");
    const ts = new Date(entryAt);

    const isInlineChat = !!inlineEntryId && hasChat;
    const composedBody = isInlineChat ? composeChatTranscript(chatTurns, body) : body;
    const finalKind = isInlineChat ? "chat" : entryKind;

    const payload = {
      user_id: user.id,
      journal_id: journalId,
      title: title.trim() || null,
      body: composedBody,
      mood,
      tags: mergeInlineTags(composedBody, tags),
      verse_ref: verseRef.trim() || null,
      belief_id: beliefId || null,
      prompt_id: promptId,
      location_name: locationName.trim() || null,
      lat,
      lng,
      weather,
      weather_temp_c: weatherTempC,
      weather_icon: weatherIcon,
      analyze_for_mirror: entryKind === "vent" ? false : analyzeForMirror,
      entry_at_ts: ts.toISOString(),
      entry_at: ts.toISOString().slice(0, 10),
      entry_kind: finalKind,
    };

    let entryId = editId ?? inlineEntryId ?? null;
    if (entryId) {
      const { error } = await supabase
        .from("journal_entries")
        .update(payload)
        .eq("id", entryId)
        .eq("user_id", user.id);
      if (error) {
        setBusy(false);
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("journal_entries")
        .insert(payload)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        setBusy(false);
        toast({ title: "Save failed", description: error?.message, variant: "destructive" });
        return;
      }
      entryId = data.id;
    }

    if (entryId && composedBody.includes("[[")) {
      await syncEntryWikilinks(user.id, entryId, composedBody);
    }

    if (pendingFiles.length && entryId) {
      setBusyLabel("Uploading photos");
      try {
        const uploaded = await uploadEntryPhotos(user.id, entryId, pendingFiles);
        await supabase.from("journal_photos").insert(
          uploaded.map((u) => ({
            user_id: user.id,
            entry_id: entryId!,
            storage_path: u.storage_path,
            width: u.width,
            height: u.height,
          })),
        );
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
            const { data: refreshed } = await supabase
              .from("journal_entries")
              .select("body,title,summary")
              .eq("id", entryId!)
              .maybeSingle();
            if (refreshed?.body) setBody(refreshed.body);
            if (refreshed?.title) setTitle(refreshed.title);
            else if (tx.title) setTitle(tx.title);
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
      } catch (e) {
        toast({ title: "Photo upload failed", description: String(e), variant: "destructive" });
      }
    }

    if (analyzeForMirror && entryId) {
      supabase.functions
        .invoke("journal-score-entry", { body: { entry_id: entryId } })
        .catch((e) => console.error("score err", e));
    }

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
      navigate(`/journal/chat/${entryId}`);
      return;
    }

    navigate(`/journal/${entryId}`);
  }, [
    user,
    chatTurns,
    body,
    title,
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

  const triggerPhotos = useCallback(() => photoInputRef.current?.click(), []);
  const triggerAudio = useCallback(() => dictateRef.current?.toggle(), []);
  const triggerPrompts = useCallback(() => navigate("/journal/prompts"), [navigate]);
  const triggerHandwritten = useCallback(() => setSketchOpen(true), []);

  const focusBodyEditor = useCallback(() => {
    composerLockScrollYRef.current = window.scrollY;
    const el = bodyTextareaRef.current;
    if (!el) return;
    el.focus();
    const pos = el.value.length;
    el.setSelectionRange(pos, pos);
  }, []);

  const appendDictatedText = useCallback((chunk: string) => {
    setBody((b) => {
      const next = mergeDictatedText(b, chunk);
      requestAnimationFrame(() => {
        bodyMarkers.syncMarkersFromBody(next);
        bodyMarkers.updateActiveMarker(next, next.length);
      });
      return next;
    });
    requestAnimationFrame(() => scrollCaretIntoView());
  }, [bodyMarkers, scrollCaretIntoView]);

  const handlePhotoInputChange = useCallback((files: FileList | null) => {
    setPendingFiles((arr) => [...arr, ...Array.from(files ?? [])]);
  }, []);

  const removePendingFile = useCallback((file: File) => {
    setPendingFiles((arr) => arr.filter((f) => f !== file));
  }, []);

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
        if (r.body) setBody(r.body);
        if (r.title) setTitle(r.title);
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
      setPendingFiles((arr) => [...arr.filter((f) => !isJournalSketchAsset(f.name)), file]);
    },
    [editId, user],
  );

  const handleSketchUnsavedExit = useCallback((file: File) => {
    setPendingFiles((arr) => [...arr.filter((f) => !isJournalSketchAsset(f.name)), file]);
    toast({
      title: "Handwritten note kept",
      description: "Save your entry to attach it to your journal.",
    });
  }, []);

  return {
    user,
    loading,
    editId,
    navigate,
    kbInset,
    vvOffsetTop,
    bodyFocused,
    setBodyFocused,
    bodyTextareaRef,
    focusBodyEditor,
    title,
    setTitle,
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
    openChatMode,
    exitChatMode,
    triggerPhotos,
    triggerAudio,
    triggerPrompts,
    triggerHandwritten,
    removeExistingPhoto,
    removePendingFile,
    useMyLocation,
    appendDictatedText,
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
