import { useEffect, useRef, useState } from "react";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import SketchPad from "@/components/journal/SketchPad";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Camera, X, Loader2, MapPin, BookOpen, Sparkles, Trash2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface BeliefOpt {
  id: string;
  topic: string;
  statement: string;
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
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const [sketchOpen, setSketchOpen] = useState(false);

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
      if (kindInit !== "vent") {
        setBody((b) => b || `${ENTRY_KIND_META[kindInit].placeholder}\n\n`);
      }
    }
  }, [params, editId, navigate]);

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
      setEntryKind(coerceJournalEntryKind((data as { entry_kind?: string | null }).entry_kind));
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

  const save = async () => {
    dictateRef.current?.stop();
    if (!body.trim() && !title.trim() && !pendingFiles.length && !existingPhotos.length) {
      toast({ title: "Write something or add a photo first", variant: "destructive" });
      return;
    }
    setBusy(true);
    setBusyLabel("Saving");
    const ts = new Date(entryAt);
    const payload = {
      user_id: user.id,
      journal_id: journalId,
      title: title.trim() || null,
      body: body,
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
      entry_kind: entryKind,
    };

    let entryId = editId;
    if (editId) {
      const { error } = await supabase
        .from("journal_entries")
        .update(payload)
        .eq("id", editId)
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
            <option value="vent">{ENTRY_KIND_META.vent.label} (private)</option>
          </select>
        </section>

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
