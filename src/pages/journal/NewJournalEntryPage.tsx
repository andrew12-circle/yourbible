import { useEffect, useMemo, useRef, useState } from "react";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import SketchPad from "@/components/journal/SketchPad";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Camera, X, Loader2, MapPin, BookOpen, Sparkles, Trash2, PenLine, Ear, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import JournalLayout from "./JournalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { MoodPicker } from "@/components/journal/MoodPicker";
import { TagInput } from "@/components/journal/TagInput";
import { uploadEntryPhotos, getSignedPhotoUrls } from "@/lib/journal/photos";
import { transcribeJournalSketch } from "@/lib/journal/sketchTranscription";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
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
  const [replyWithAi, setReplyWithAi] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const v = localStorage.getItem("journal.reply_with_ai");
    return v === "1" || v === "true";
  });
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
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const [sketchOpen, setSketchOpen] = useState(false);
  const [listeningSections, setListeningSections] = useState<ListeningSections>({
    thought: "",
    words: "",
    plan: "",
    interpretation: "",
  });
  const lastSyncedListeningKey = useRef<string | null>(null);

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
      try { localStorage.setItem("journal.reply_with_ai", "1"); } catch { /* ignore */ }
      navigate(`/journal/${entryId}`);
      return;
    }

    if (replyWithAi && canReplyWithAi && entryId) {
      try {
        localStorage.setItem("journal.reply_with_ai", "1");
      } catch { /* ignore */ }
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
    } else if (!replyWithAi) {
      try { localStorage.setItem("journal.reply_with_ai", "0"); } catch { /* ignore */ }
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
  const canReplyWithAi = !isVent && entryKind !== "chat";
  const listeningCanSave = useMemo(() => !isListeningEmpty(listeningSections), [listeningSections]);

  return (
    <JournalLayout title={layoutTitle} back={layoutBack}>
      <div className="space-y-5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="text-lg font-display"
        />

        <section>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entry type</Label>
          <p className="mt-1 mb-2 text-xs text-muted-foreground leading-relaxed">
            Mark dreams, praise reports, or testimonies to find them under Faith journal. Vents stay private — hidden
            from the main journal, the mirror, and My AI.
          </p>
          <select
            value={entryKind ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setEntryKind(v ? coerceJournalEntryKind(v) : null);
            }}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Entry type"
          >
            <option value="">General journal</option>
            <option value="dream">{ENTRY_KIND_META.dream.label}</option>
            <option value="praise_report">{ENTRY_KIND_META.praise_report.label}</option>
            <option value="testimony">{ENTRY_KIND_META.testimony.label}</option>
            <option value="listening">{ENTRY_KIND_META.listening.label} — thought → words → plan → interpret</option>
            <option value="vent">{ENTRY_KIND_META.vent.label} (private)</option>
          </select>
        </section>

        {isListening ? (
          <section
            className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-700/40 dark:bg-amber-900/20"
            aria-label="Listening entry — four-stage flow"
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
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/85">
                    {section.hint}
                  </p>
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
        ) : (
          <>
            <div className="flex items-center justify-end gap-2">
              <DictateButton
                ref={dictateRef}
                size="sm"
                onAppend={(chunk) => setBody((b) => mergeDictatedText(b, chunk))}
                onInterim={setDictInterim}
              />
            </div>
            {/* Sans: match .app-theme body stack; list previews already default sans. */}
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder={bodyPlaceholder}
              className="font-sans text-[15px] leading-relaxed"
            />
            {dictInterim.trim() ? (
              <p className="text-sm italic leading-relaxed text-muted-foreground/80" aria-live="polite">
                {dictInterim}
              </p>
            ) : null}
          </>
        )}

        {/* Photos */}
        <section>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Photos</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {existingPhotos.map((p) => (
              <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                {p.url ? (
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(p.id, p.storage_path)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
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
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-foreground hover:text-foreground transition">
              <Camera className="w-5 h-5" />
              <span className="text-[10px] mt-1">Photo</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) =>
                  setPendingFiles((arr) => [...arr, ...Array.from(e.target.files ?? [])])
                }
              />
            </label>
            <button
              type="button"
              onClick={() => { dictateRef.current?.stop(); setSketchOpen(true); }}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-foreground hover:text-foreground transition"
            >
              <PenLine className="w-5 h-5" />
              <span className="text-[10px] mt-1">Sketch</span>
            </button>
          </div>
        </section>

        {/* Mood */}
        <section>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mood</Label>
          <div className="mt-2"><MoodPicker value={mood} onChange={setMood} /></div>
        </section>

        {/* Tags */}
        <section>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
          <div className="mt-2"><TagInput tags={tags} onChange={setTags} /></div>
        </section>

        {/* Date/time + location */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">When</Label>
            <Input
              type="datetime-local"
              value={entryAt}
              onChange={(e) => setEntryAt(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
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
          </div>
        </section>

        {/* Links */}
        <section className="grid sm:grid-cols-2 gap-4">
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

        {/* Privacy */}
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
                  ? "Vents are private — never analyzed by the mirror or referenced by My AI."
                  : "When on, Lovable AI scores this entry on axes like love/fear, trust/abandonment, grace/guilt. Used in your weekly \"mirror\" report. Off by default — your private entries stay private."}
              </p>
            </div>
          </div>
        </section>

        {canReplyWithAi && (
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-teal-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="reply-with-ai" className="font-medium">Have AI reply when I save</Label>
                  <Switch id="reply-with-ai" checked={replyWithAi} onCheckedChange={setReplyWithAi} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Opens a conversation grounded in your beliefs, past journals, identity, and artifacts. Vents stay private and are never shared with AI.
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={busy} className="flex-1 sm:flex-none">
            {busy ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {busyLabel}…</>
            ) : (
              editId ? "Save changes" : "Save entry"
            )}
          </Button>
          <Button variant="ghost" onClick={() => navigate(layoutBack)}>
            Cancel
          </Button>
        </div>
      </div>
      <SketchPad
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        onSave={(file) => {
          setPendingFiles((arr) => [...arr, file]);
        }}
        filename={editId ? `sketch-${editId}` : undefined}
      />
    </JournalLayout>
  );
}
