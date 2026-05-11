import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Camera, X, Loader2, MapPin, BookOpen, Sparkles, Trash2 } from "lucide-react";
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
import { getDefaultJournalId } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";

interface BeliefOpt {
  id: string;
  topic: string;
  statement: string;
}

export default function NewJournalEntryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [params] = useSearchParams();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
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
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [weatherTempC, setWeatherTempC] = useState<number | null>(null);
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; storage_path: string; url?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Saving");

  // Pre-fill from verse capture
  useEffect(() => {
    const v = params.get("verse");
    const r = params.get("ref");
    const jid = params.get("journalId");
    if (jid) setJournalId(jid);
    if (r) setVerseRef(r);
    if (v) {
      setTitle((t) => t || (r ? `Reflection on ${r}` : "Verse reflection"));
      setBody(
        (b) =>
          b ||
          `${r ? `${r}\n` : ""}"${v}"\n\n`,
      );
    }
  }, [params]);

  // Load existing entry
  useEffect(() => {
    if (!editId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", editId)
        .maybeSingle();
      if (!data) return;
      setTitle(data.title ?? "");
      setBody(data.body ?? "");
      setMood(data.mood);
      setTags(data.tags ?? []);
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
      location_name: locationName.trim() || null,
      lat,
      lng,
      weather,
      weather_temp_c: weatherTempC,
      weather_icon: weatherIcon,
      analyze_for_mirror: analyzeForMirror,
      entry_at_ts: ts.toISOString(),
      entry_at: ts.toISOString().slice(0, 10),
    };

    let entryId = editId;
    if (editId) {
      const { error } = await supabase.from("journal_entries").update(payload).eq("id", editId);
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

  return (
    <JournalLayout title={editId ? "Edit entry" : "New entry"} back={editId ? `/journal/${editId}` : "/journal"}>
      <div className="space-y-5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="text-lg font-display"
        />

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          placeholder="What happened today? What are you carrying?"
          className="font-serif text-[15px] leading-relaxed"
        />

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
              <span className="text-[10px] mt-1">Add</span>
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
                <Switch id="analyze" checked={analyzeForMirror} onCheckedChange={setAnalyzeForMirror} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                When on, Lovable AI scores this entry on axes like love/fear, trust/abandonment, grace/guilt.
                Used in your weekly "mirror" report. Off by default — your private entries stay private.
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
          <Button variant="ghost" onClick={() => navigate(editId ? `/journal/${editId}` : "/journal")}>
            Cancel
          </Button>
        </div>
      </div>
    </JournalLayout>
  );
}