import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal, Maximize2, NotebookText, Plus, X, Trash2,
  Heading1, List as ListIcon, ListOrdered, CheckSquare, Quote,
  Table as TableIcon, Paperclip, Tag, Sparkles, Loader2, MapPin, PenLine,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { transcribeJournalSketch } from "@/lib/journal/sketchTranscription";

interface EntryRow {
  id: string;
  title: string | null;
  body: string;
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
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryRef = useRef<EntryRow | null>(null);
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const [sketchOpen, setSketchOpen] = useState(false);
  const [privacyFog, setPrivacyFog] = useState(false);
  const [privacyReveal, setPrivacyReveal] = useState(false);

  // Load entry
  useEffect(() => {
    if (!entryId) { setEntry(null); setPhotos([]); return; }
    (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select(
          "id,title,body,mood,tags,entry_at_ts,pinned,analyze_for_mirror,journal_id,location_name,weather,weather_temp_c,weather_icon,entry_kind",
        )
        .eq("id", entryId)
        .maybeSingle();
      setEntry((data as EntryRow | null) ?? null);
      const { data: ph } = await supabase
        .from("journal_photos")
        .select("id,storage_path")
        .eq("entry_id", entryId);
      const urls = await getSignedPhotoUrls((ph ?? []).map((p) => p.storage_path));
      setPhotos((ph ?? []).map((p) => ({ ...p, url: urls[p.storage_path] })));
    })();
  }, [entryId]);

  useEffect(() => {
    return () => dictateRef.current?.stop();
  }, []);

  useEffect(() => {
    dictateRef.current?.stop();
    setDictInterim("");
  }, [entryId]);

  const journal = journals.find((j) => j.id === entry?.journal_id) ?? null;

  // Autosave on entry mutation
  const queueSave = (patch: Partial<EntryRow>) => {
    const cur = entryRef.current;
    if (!cur) return;
    const merged = { ...cur, ...patch };
    entryRef.current = merged;
    setEntry(merged);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from("journal_entries")
        .update(patch)
        .eq("id", merged.id)
        .eq("user_id", user.id);
      setSaving(false);
      if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
      else onChanged();
    }, 400);
  };

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

  if (!entry) {
    entryRef.current = null;
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
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

  const ta = bodyRef.current;
  const cursor = ta?.selectionStart ?? entry.body.length;
  const maskedBody = fogTextExceptActiveWord(entry.body, cursor);

  return (
    <>
      {/* Header */}
      <header className="flex items-center gap-1 px-3 h-12 border-b border-border/60 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="Close editor"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center text-[13px] text-muted-foreground tabular-nums">
          {dateLabel}
          {saving && <span className="ml-2 text-[11px] opacity-70">Saving…</span>}
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
            {entry.entry_kind === "chat" && (
              <DropdownMenuItem onClick={() => navigate(`/journal/chat/${entry.id}`)}>
                Open chat session
              </DropdownMenuItem>
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
      <div className="flex items-center gap-0.5 px-3 h-10 border-b border-border/60 flex-shrink-0 overflow-x-auto">
        <TBtn title="Heading" onClick={() => insert("\n# ", "", "Heading")}><Heading1 className="w-4 h-4" /></TBtn>
        <TBtn title="Bullet list" onClick={() => insert("\n- ", "", "item")}><ListIcon className="w-4 h-4" /></TBtn>
        <TBtn title="Numbered list" onClick={() => insert("\n1. ", "", "item")}><ListOrdered className="w-4 h-4" /></TBtn>
        <TBtn title="Checklist" onClick={() => insert("\n- [ ] ", "", "task")}><CheckSquare className="w-4 h-4" /></TBtn>
        <TBtn title="Quote" onClick={() => insert("\n> ", "", "quote")}><Quote className="w-4 h-4" /></TBtn>
        <TBtn title="Table" onClick={() => insert("\n| col1 | col2 |\n| --- | --- |\n| ", " | |\n", "")}><TableIcon className="w-4 h-4" /></TBtn>
        <div className="w-px h-5 bg-border mx-1" />
        <TBtn title="Attach photo" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="w-4 h-4" />
        </TBtn>
        <TBtn title="Sketch" onClick={() => { dictateRef.current?.stop(); setSketchOpen(true); }}>
          <PenLine className="w-4 h-4" />
        </TBtn>
        <TBtn title="Tags" onClick={() => setShowMeta(true)}><Tag className="w-4 h-4" /></TBtn>
        <TBtn
          title={privacyFog ? "Disable privacy fog" : "Enable privacy fog"}
          onClick={() => {
            setPrivacyFog((v) => !v);
            setPrivacyReveal(false);
          }}
        >
          <span className="text-xs font-semibold">{privacyFog ? "Fog On" : "Fog"}</span>
        </TBtn>
        {privacyFog && (
          <TBtn
            title={privacyReveal ? "Hide text" : "Reveal text"}
            onClick={() => setPrivacyReveal((v) => !v)}
          >
            <span className="text-xs font-semibold">{privacyReveal ? "Hide" : "Reveal"}</span>
          </TBtn>
        )}
        <DictateButton
          ref={dictateRef}
          size="sm"
          onAppend={(chunk) => {
            const cur = entryRef.current;
            if (!cur) return;
            queueSave({ body: mergeDictatedText(cur.body, chunk) });
          }}
          onInterim={setDictInterim}
        />
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-6">
          <Input
            value={entry.title ?? ""}
            onChange={(e) => queueSave({ title: e.target.value })}
            placeholder="Title"
            className="text-[22px] font-semibold tracking-tight border-0 px-0 focus-visible:ring-0 shadow-none h-auto py-2 placeholder:text-muted-foreground/50"
          />

          {photos.length > 0 && (
            <div className={`my-4 grid gap-2 ${photos.length === 1 ? "" : "grid-cols-2"}`}>
              {photos.map((p) => (
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

          {/* Sans: match .app-theme journal shell (FloatingJournalPanel uses font-sans). */}
          <div className="relative">
            <Textarea
              ref={bodyRef}
              value={entry.body}
              onChange={(e) => queueSave({ body: e.target.value })}
              onSelect={() => privacyFog && setEntry((cur) => (cur ? { ...cur } : cur))}
              placeholder="What happened today? What are you carrying?"
              className={`min-h-[60vh] border-0 px-0 focus-visible:ring-0 shadow-none resize-none font-sans text-[16px] leading-relaxed bg-transparent relative z-10 ${
                privacyFog && !privacyReveal ? "text-transparent caret-foreground" : ""
              }`}
            />
            {privacyFog && !privacyReveal && (
              <pre
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 m-0 whitespace-pre-wrap break-words font-sans text-[16px] leading-relaxed text-foreground"
              >
                {maskedBody || " "}
              </pre>
            )}
          </div>
          {dictInterim.trim() ? (
            <p
              className="mt-1 text-sm italic leading-relaxed text-muted-foreground/80"
              aria-live="polite"
            >
              {dictInterim}
            </p>
          ) : null}

          {showMeta && (
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
        </div>
      </div>

      <SketchPad
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        onSave={async (file) => {
          const dt = new DataTransfer();
          dt.items.add(file);
          const inserted = await onPickPhotos(dt.files);
          const path = inserted?.[0]?.storage_path;
          if (!path || !user || !entry) return;
          toast({ title: "Reading your sketch…", description: "AI is transcribing your handwriting." });
          const result = await transcribeJournalSketch({ entryId: entry.id, storagePath: path });
          if (!result.ok) {
            toast({
              title: "Sketch saved",
              description: result.error,
              variant: "destructive",
            });
            return;
          }
          if (result.skipped) {
            toast({ title: "Sketch saved", description: "This sketch was already transcribed." });
            return;
          }
          const cur = entryRef.current;
          if (cur?.id === entry.id) {
            if (saveTimer.current) {
              clearTimeout(saveTimer.current);
              saveTimer.current = null;
            }
            entryRef.current = { ...cur, body: result.body };
            setEntry({ ...entryRef.current });
          }
          onChanged();
          toast({ title: "Sketch transcribed", description: "Text was added to your journal body." });
        }}
        filename={`sketch-${entry.id}`}
      />

      {/* Footer strip */}
      <footer className="flex items-center gap-3 px-4 h-9 border-t border-border/60 text-[12px] text-muted-foreground flex-shrink-0">
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
    </>
  );
}

function fogTextExceptActiveWord(text: string, cursorIndex: number): string {
  if (!text) return text;
  const safeCursor = Math.max(0, Math.min(cursorIndex, text.length));
  const isWordChar = (ch: string) => /[A-Za-z0-9_]/.test(ch);

  let start = safeCursor;
  while (start > 0 && isWordChar(text[start - 1])) start -= 1;
  let end = safeCursor;
  while (end < text.length && isWordChar(text[end])) end += 1;

  if (start === end) {
    return text.replace(/\S/g, "•");
  }

  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    out += i >= start && i < end ? c : /\S/.test(c) ? "•" : c;
  }
  return out;
}

function TBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );
}