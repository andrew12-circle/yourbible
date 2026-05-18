import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import SketchPad from "@/components/journal/SketchPad";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Camera, X, Loader2, MapPin, BookOpen, Sparkles, Trash2, PenLine, Ear, Send, ChevronDown,
  ChevronLeft, MoreHorizontal, Image as ImageIcon, Mic, MessageCircle, Plus, FileText, Lightbulb,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { MoodPicker } from "@/components/journal/MoodPicker";
import { TagInput } from "@/components/journal/TagInput";
import { uploadEntryPhotos, getSignedPhotoUrls } from "@/lib/journal/photos";
import { transcribeJournalSketch } from "@/lib/journal/sketchTranscription";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import { useKeyboardInset, useLockBodyScrollWhenKeyboardActive } from "@/hooks/useKeyboardInset";
import { JOURNAL_EXPAND_HANDOFF_KEY, type JournalExpandHandoffPayload } from "@/lib/journal/links";
import {
  coerceJournalEntryKind,
  ENTRY_KIND_META,
  kindToLifeSegment,
  parseJournalEntryKindParam,
  type JournalEntryKind,
} from "@/lib/journal/entryKinds";
import {
  LISTENING_SECTIONS,
  composeListeningBody,
  isListeningBody,
  isListeningEmpty,
  parseListeningBody,
  type ListeningSectionKey,
  type ListeningSections,
} from "@/lib/journal/listeningEntry";

interface BeliefOpt {
  id: string;
  topic: string;
  statement: string;
}

interface InlineChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function composeChatTranscript(turns: InlineChatTurn[], trailingUserDraft?: string): string {
  const lines: string[] = [];
  for (const t of turns) {
    const label = t.role === "assistant" ? "**AI**" : "**You**";
    lines.push(`${label}:\n\n${t.content.trim()}\n`);
  }
  if (trailingUserDraft && trailingUserDraft.trim()) {
    lines.push(`**You**:\n\n${trailingUserDraft.trim()}\n`);
  }
  return lines.join("\n---\n\n").trim();
}

export default function NewJournalEntryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const kbInset = useKeyboardInset();

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
  // Default OFF for every new entry. Users explicitly opt-in per entry via the
  // "Journal with AI" toggle. We intentionally do NOT remember this across entries
  // so a normal journal stays a normal journal unless asked.
  const [replyWithAi, setReplyWithAi] = useState<boolean>(false);
  const [journalId, setJournalId] = useState<string | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [weatherTempC, setWeatherTempC] = useState<number | null>(null);
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; storage_path: string; url?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Saving");
  // Inline AI conversation (chat-while-you-write)
  const [inlineEntryId, setInlineEntryId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatTurns, setChatTurns] = useState<InlineChatTurn[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const [sketchOpen, setSketchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [journalName, setJournalName] = useState<string>("Journal");
  const [composerFocused, setComposerFocused] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [listeningSections, setListeningSections] = useState<ListeningSections>({
    thought: "",
    words: "",
    plan: "",
    interpretation: "",
  });
  const lastSyncedListeningKey = useRef<string | null>(null);
  useLockBodyScrollWhenKeyboardActive(
    replyWithAi && entryKind !== "vent" && entryKind !== "listening" && composerFocused,
  );

  // Auto-scroll the chat transcript to the latest message (like ChatGPT)
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      chatBottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }, [chatTurns.length, aiBusy]);

  // Pre-fill from verse capture
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
    if (jid) setJournalId(jid);
    if (pid) setPromptId(pid);
    if (r) setVerseRef(r);
    if (v) {
      setTitle((t) => t || (r ? `Reflection on ${r}` : "Verse reflection"));
      setBody(
        (b) =>
          b ||
          `${r ? `${r}\n` : ""}"${v}"\n\n`,
      );
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
      navigate("/journal/chat", { replace: true });
      return;
    }
    if (kindInit) {
      if (kindInit === "vent" && !editId) {
        // Vents have a dedicated, deliberately minimal UI.
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
    // Only re-hydrate sections when the kind switches; later edits flow through the per-section state below.
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

  const setListeningSection = (key: ListeningSectionKey, value: string) => {
    setListeningSections((prev) => ({ ...prev, [key]: value }));
  };

  // After URL prefill: apply floating-panel expand handoff (route state + localStorage fallback)
  const handoffAppliedForKey = useRef<string | null>(null);
  useEffect(() => {
    if (editId) return;
    const fromState = (location.state as { journalHandoff?: JournalExpandHandoffPayload } | null)?.journalHandoff;
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
    try {
      localStorage.removeItem(JOURNAL_EXPAND_HANDOFF_KEY);
    } catch {
      /* ignore */
    }
    if (fromState) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
  }, [editId, location.key, location.pathname, location.search, location.state, navigate]);

  // Load existing entry
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
      setBody(data.body ?? "");
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

      if (loadedKind === "chat") {
        setInlineEntryId(editId);
        setReplyWithAi(true);
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
  }, [editId, user]);

  // Load beliefs for picker
  useEffect(() => {
    if (!user) return;
    supabase
      .from("belief_nodes")
      .select("id,topic,statement")
      .order("topic")
      .then(({ data }) => setBeliefs((data as BeliefOpt[]) ?? []));
  }, [user]);

  // Default journal + auto-context on new entries
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

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const useMyLocation = () => {
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
  };

  const removeExistingPhoto = async (photoId: string, storage_path: string) => {
    setExistingPhotos((ps) => ps.filter((p) => p.id !== photoId));
    await supabase.storage.from("journal-photos").remove([storage_path]).catch(() => {});
    await supabase.from("journal_photos").delete().eq("id", photoId);
  };

  const loadChatTurns = async (cId: string) => {
    const { data } = await supabase
      .from("my_ai_messages")
      .select("id,role,content,created_at")
      .eq("chat_id", cId)
      .order("created_at", { ascending: true });
    setChatTurns(
      ((data as { id: string; role: string; content: string }[]) ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })),
    );
  };

  const ensureChatEntry = async (): Promise<{ entryId: string; chatId: string } | null> => {
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
          lat, lng, weather, weather_temp_c: weatherTempC, weather_icon: weatherIcon,
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
      // Make sure existing entry is marked as chat
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
  };

  const sendToAi = async () => {
    const text = body.trim();
    if (!text || aiBusy) return;
    dictateRef.current?.stop();
    setAiBusy(true);
    try {
      const ensured = await ensureChatEntry();
      if (!ensured) return;
      // Optimistically render the user turn
      const tempId = `tmp-${Date.now()}`;
      setChatTurns((prev) => [...prev, { id: tempId, role: "user", content: text }]);
      setBody("");
      const { data, error } = await supabase.functions.invoke("my-ai-chat", {
        body: {
          chat_id: ensured.chatId,
          message: text,
          mode: "journal",
          journal_entry_id: ensured.entryId,
          include_general_knowledge: true,
        },
      });
      if (error) throw new Error(error.message);
      const payload = data as { error?: string; chat_id?: string } | null;
      if (payload && typeof payload === "object" && payload.error) throw new Error(payload.error);
      await loadChatTurns(ensured.chatId);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (e) {
      toast({ title: "AI reply failed", description: String(e), variant: "destructive" });
      setBody((b) => (b ? b : text));
      // Drop optimistic user turn on failure
      setChatTurns((prev) => prev.filter((t) => !t.id.startsWith("tmp-")));
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    dictateRef.current?.stop();
    const hasChat = chatTurns.length > 0;
    if (!body.trim() && !title.trim() && !pendingFiles.length && !existingPhotos.length && !hasChat) {
      toast({ title: "Write something or add a photo first", variant: "destructive" });
      return;
    }
    setBusy(true);
    setBusyLabel("Saving");
    const ts = new Date(entryAt);

    // Inline AI chat mode: the entry already exists, body holds composed transcript
    const isInlineChat = !!inlineEntryId && hasChat;
    const composedBody = isInlineChat ? composeChatTranscript(chatTurns, body) : body;
    const finalKind = isInlineChat ? "chat" : entryKind;

    const payload = {
      user_id: user.id,
      journal_id: journalId,
      title: title.trim() || null,
      body: composedBody,
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
      // Vents are private — never include in mirror analysis regardless of toggle state.
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
        let txError: string | undefined;
        let transcribedCount = 0;
        for (let i = 0; i < pendingFiles.length; i++) {
          const f = pendingFiles[i];
          const isSketch = f.type === "image/png" && /sketch-/i.test(f.name);
          if (!isSketch) continue;
          const path = uploaded[i]?.storage_path;
          if (!path) continue;
          setBusyLabel("Reading sketch");
          const r = await transcribeJournalSketch({ entryId: entryId!, storagePath: path });
          if (!r.ok) {
            txError = r.error;
            break;
          }
          if (!r.skipped) transcribedCount += 1;
        }
        if (txError) {
          toast({
            title: "Photos saved",
            description: txError,
            variant: "destructive",
          });
        } else if (transcribedCount > 0) {
          toast({
            title: "Sketch transcribed",
            description: "Handwriting was added to your journal body.",
          });
        }
      } catch (e) {
        toast({ title: "Photo upload failed", description: String(e), variant: "destructive" });
      }
    }

    if (analyzeForMirror && entryId) {
      supabase.functions.invoke("journal-score-entry", { body: { entry_id: entryId } }).catch((e) =>
        console.error("score err", e),
      );
    }

    if (isInlineChat) {
      navigate(`/journal/${entryId}`);
      return;
    }

    if (replyWithAi && canReplyWithAi && entryId) {
      setBusyLabel("Opening AI reply");
      try {
        // Mark as chat so JournalChatPage will load it and the finalize flow applies.
        await supabase
          .from("journal_entries")
          .update({ entry_kind: "chat" })
          .eq("id", entryId)
          .eq("user_id", user.id);
        // Attach a chat thread if one doesn't already exist.
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
  };

  const lifeSegment = entryKind ? kindToLifeSegment(entryKind) : null;
  const layoutBack = editId
    ? `/journal/${editId}`
    : entryKind === "vent"
      ? "/journal/vent"
      : lifeSegment
        ? `/journal/life/${lifeSegment}`
        : "/journal";
  const layoutTitle = editId ? "Edit entry" : entryKind ? `New ${ENTRY_KIND_META[entryKind].label}` : "New entry";
  const bodyPlaceholder = entryKind
    ? ENTRY_KIND_META[entryKind].placeholder
    : "What happened today? What are you carrying?";
  const isVent = entryKind === "vent";
  const isListening = entryKind === "listening";
  const canReplyWithAi = !isVent && !isListening;
  const inlineChatMode = replyWithAi && canReplyWithAi;
  const listeningCanSave = useMemo(() => !isListeningEmpty(listeningSections), [listeningSections]);

  const dateLabel = useMemo(() => {
    try {
      const d = new Date(entryAt);
      const datePart = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return `${datePart}  ${timePart}`;
    } catch {
      return "Today";
    }
  }, [entryAt]);

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

  const openChatMode = async () => {
    if (!canReplyWithAi) {
      toast({ title: "Not available for this entry type" });
      return;
    }
    setReplyWithAi(true);
    await ensureChatEntry();
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const triggerPhotos = () => photoInputRef.current?.click();
  const triggerAudio = () => dictateRef.current?.toggle();
  const triggerPrompts = () => navigate("/journal/prompts");
  const triggerTemplates = () => toast({ title: "Templates coming soon" });

  const weatherLabel = weatherTempC != null
    ? `${Math.round((weatherTempC * 9) / 5 + 32)}\u00b0F`
    : (weather ?? "");

  // Mark unused vars used to satisfy lint
  void layoutTitle;
  void listeningCanSave;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Day One style header */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-3xl mx-auto px-3 sm:px-5 h-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(layoutBack)}
            className="-ml-1 px-1 h-9 flex items-center text-primary"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => setDateOpen(true)}
            className="flex-1 min-w-0 text-left text-[15px] font-semibold tracking-tight truncate"
          >
            {dateLabel}
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full text-foreground/80 hover:bg-muted"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <Button
            onClick={save}
            disabled={busy}
            size="sm"
            variant="ghost"
            className="text-primary text-[15px] font-semibold px-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Done"}
          </Button>
        </div>
        <div className="max-w-3xl mx-auto px-3 sm:px-5 pb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="uppercase tracking-wider font-semibold text-primary truncate max-w-[40%]">
            {journalName}
          </span>
          {(locationName || weatherLabel) && <span aria-hidden>·</span>}
          {locationName && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="truncate max-w-[40%] hover:text-foreground"
            >
              {locationName}
            </button>
          )}
          {weatherLabel && (
            <span className="inline-flex items-center gap-1 text-muted-foreground/80">
              {locationName && <span aria-hidden>·</span>}
              <span>{weatherLabel}</span>
            </span>
          )}
        </div>
      </header>

      <main
        className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-3 sm:px-5 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 9.5rem)" }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="border-0 bg-transparent px-0 text-[22px] leading-tight font-display font-semibold tracking-tight shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
        />

        {isListening ? (
          <section
            className="mt-2 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-700/40 dark:bg-amber-900/20"
            aria-label="Listening entry"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-full border border-amber-300 bg-amber-100/80 p-2 text-amber-700 dark:border-amber-600 dark:bg-amber-800/40 dark:text-amber-200">
                <Ear className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight">Listening — heard from God</div>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {ENTRY_KIND_META.listening.shortHint}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {LISTENING_SECTIONS.map((section) => (
                <div key={section.key} className="rounded-lg border border-border bg-background/80 p-3">
                  <Label
                    htmlFor={`listening-${section.key}`}
                    className="text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    {section.label}
                  </Label>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/85">{section.hint}</p>
                  <Textarea
                    id={`listening-${section.key}`}
                    value={listeningSections[section.key]}
                    onChange={(e) => setListeningSection(section.key, e.target.value)}
                    rows={section.rows}
                    placeholder={section.placeholder}
                    className="mt-2 font-sans text-[15px] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : inlineChatMode ? (
          <div ref={chatScrollRef} className="flex-1 -mx-3 sm:-mx-5 px-3 sm:px-5 overflow-y-auto pt-1 space-y-3">
            {body.trim() && chatTurns.length === 0 && (
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm">
                {body}
              </div>
            )}
            {chatTurns.map((t) => (
              <div
                key={t.id}
                className={
                  t.role === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-3 py-2 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap"
                    : "max-w-full px-1 py-1 text-[13px] prose prose-sm dark:prose-invert prose-p:my-2 prose-p:text-[13px] prose-p:leading-relaxed"
                }
              >
                {t.role === "assistant" ? <ReactMarkdown>{t.content}</ReactMarkdown> : <div>{t.content}</div>}
              </div>
            ))}
            {aiBusy && (
              <div className="px-1 py-1 inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            )}
            {dictInterim.trim() ? (
              <p className="text-xs italic leading-relaxed text-muted-foreground/80 px-1" aria-live="polite">
                {dictInterim}
              </p>
            ) : null}
            <div ref={chatBottomRef} />
          </div>
        ) : (
          <>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={bodyPlaceholder}
              className="mt-1 flex-1 min-h-[60dvh] resize-none border-0 bg-transparent px-0 py-2 font-sans text-[16px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
            />
            {dictInterim.trim() ? (
              <p className="text-sm italic leading-relaxed text-muted-foreground/80" aria-live="polite">
                {dictInterim}
              </p>
            ) : null}
            {(existingPhotos.length > 0 || pendingFiles.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {existingPhotos.map((p) => (
                  <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                    {p.url ? <img src={p.url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(p.id, p.storage_path)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {pendingFiles.map((f, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPendingFiles((arr) => arr.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          setPendingFiles((arr) => [...arr, ...Array.from(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <div className="hidden">
        <DictateButton
          ref={dictateRef}
          size="sm"
          onAppend={(chunk) => setBody((b) => mergeDictatedText(b, chunk))}
          onInterim={setDictInterim}
        />
      </div>

      {/* Bottom toolbar / chat composer (fixed) */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-xl"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
          transform: kbInset ? `translateY(-${kbInset}px)` : undefined,
          transition: "transform 120ms ease-out",
        }}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-2">
          {inlineChatMode ? (
            <div className="flex items-end gap-2 rounded-[28px] border border-border bg-background px-2 py-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setReplyWithAi(false)}
                className="h-9 w-9 shrink-0 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Back to writing"
              >
                <Plus className="h-5 w-5 rotate-45" />
              </button>
              <Textarea
                value={body}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                onChange={(e) => setBody(e.target.value)}
                rows={1}
                placeholder={aiBusy ? "Thinking…" : "Message"}
                className="min-h-[36px] max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[16px] leading-snug shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendToAi();
                  }
                }}
              />
              <button
                type="button"
                onClick={triggerAudio}
                className="h-9 w-9 shrink-0 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Dictate"
              >
                <Mic className="h-5 w-5" />
              </button>
              <Button
                type="button"
                size="icon"
                onClick={() => void sendToAi()}
                disabled={aiBusy || !body.trim()}
                className="h-9 w-9 shrink-0 rounded-full"
                aria-label="Send"
              >
                {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background shadow-sm">
              <div className="grid grid-cols-5 gap-1 p-1.5">
                <ToolbarTile icon={<ImageIcon className="w-5 h-5" />} label="Photos" onClick={triggerPhotos} />
                <ToolbarTile icon={<FileText className="w-5 h-5" />} label="Templates" onClick={triggerTemplates} />
                <ToolbarTile icon={<Lightbulb className="w-5 h-5" />} label="Prompts" onClick={triggerPrompts} />
                <ToolbarTile icon={<Mic className="w-5 h-5" />} label="Audio" onClick={triggerAudio} />
                <ToolbarTile
                  icon={<MessageCircle className="w-5 h-5" />}
                  label="Chat AI"
                  onClick={() => void openChatMode()}
                  disabled={!canReplyWithAi}
                  accent
                />
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="w-full flex items-center justify-center gap-1 text-[12px] text-muted-foreground py-1.5 hover:text-foreground"
              >
                <ChevronDown className="w-3.5 h-3.5" /> More
              </button>
            </div>
          )}
        </div>
      </div>

      <Sheet open={dateOpen} onOpenChange={setDateOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>When</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <Input
              type="datetime-local"
              value={entryAt}
              onChange={(e) => setEntryAt(e.target.value)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Entry details</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5 pb-6">
            <section>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entry type</Label>
              <select
                value={entryKind ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setEntryKind(v ? coerceJournalEntryKind(v) : null);
                }}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">General journal</option>
                <option value="dream">{ENTRY_KIND_META.dream.label}</option>
                <option value="praise_report">{ENTRY_KIND_META.praise_report.label}</option>
                <option value="testimony">{ENTRY_KIND_META.testimony.label}</option>
                <option value="listening">{ENTRY_KIND_META.listening.label}</option>
                <option value="vent">{ENTRY_KIND_META.vent.label} (private)</option>
              </select>
            </section>

            <section>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mood</Label>
              <div className="mt-2"><MoodPicker value={mood} onChange={setMood} /></div>
            </section>

            <section>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
              <div className="mt-2"><TagInput tags={tags} onChange={setTags} /></div>
            </section>

            <section>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Where</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Location (optional)"
                />
                <Button type="button" size="icon" variant="outline" onClick={useMyLocation} title="Use my location">
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Linked verse
                </Label>
                <Input
                  value={verseRef}
                  onChange={(e) => setVerseRef(e.target.value)}
                  placeholder="e.g. John 14:27"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Linked belief</Label>
                <select
                  value={beliefId}
                  onChange={(e) => setBeliefId(e.target.value)}
                  className="mt-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— none —</option>
                  {beliefs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.topic}: {b.statement.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="analyze" className="font-medium">Include in worldview mirror</Label>
                    <Switch
                      id="analyze"
                      checked={!isVent && analyzeForMirror}
                      onCheckedChange={setAnalyzeForMirror}
                      disabled={isVent}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isVent
                      ? "Vents are private — never analyzed by the mirror."
                      : "Lovable AI scores this entry for your weekly mirror report."}
                  </p>
                </div>
              </div>
            </section>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { setMoreOpen(false); setSketchOpen(true); }}
            >
              <PenLine className="w-4 h-4 mr-2" /> Add sketch
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <SketchPad
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        onSave={(file) => {
          setPendingFiles((arr) => [...arr, file]);
        }}
        filename={editId ? `sketch-${editId}` : undefined}
      />
    </div>
  );
}

function ToolbarTile({
  icon, label, onClick, disabled, accent,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition text-[11px] font-medium",
        disabled ? "text-muted-foreground/40" : "text-foreground hover:bg-muted active:bg-muted/80",
        accent && !disabled && "text-primary",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
