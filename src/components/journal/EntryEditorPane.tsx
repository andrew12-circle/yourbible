import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal, Maximize2, NotebookText, Plus, X, Trash2,
  Heading1, List as ListIcon, ListOrdered, CheckSquare, Quote,
  Table as TableIcon, Paperclip, Tag, Sparkles, Loader2, MapPin,
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

  // Load entry
  useEffect(() => {
    if (!entryId) { setEntry(null); setPhotos([]); return; }
    (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("id,title,body,mood,tags,entry_at_ts,pinned,analyze_for_mirror,journal_id,location_name,weather,weather_temp_c,weather_icon")
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

  const journal = journals.find((j) => j.id === entry?.journal_id) ?? null;

  // Autosave on entry mutation
  const queueSave = (patch: Partial<EntryRow>) => {
    if (!entry) return;
    setEntry({ ...entry, ...patch });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from("journal_entries")
        .update(patch)
        .eq("id", entry.id);
      setSaving(false);
      if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
      else onChanged();
    }, 400);
  };

  // Toolbar markdown insert
  const insert = (before: string, after = "", placeholder = "") => {
    const ta = bodyRef.current;
    if (!ta || !entry) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = entry.body.slice(start, end) || placeholder;
    const next = entry.body.slice(0, start) + before + sel + after + entry.body.slice(end);
    queueSave({ body: next });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + sel.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const onPickPhotos = async (files: FileList | null) => {
    if (!files || !files.length || !entry || !user) return;
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
    } catch (e) {
      toast({ title: "Photo upload failed", description: String(e), variant: "destructive" });
    }
  };

  const removePhoto = async (id: string, storage_path: string) => {
    setPhotos((p) => p.filter((x) => x.id !== id));
    await supabase.storage.from("journal-photos").remove([storage_path]).catch(() => {});
    await supabase.from("journal_photos").delete().eq("id", id);
  };

  const remove = async () => {
    if (!entry) return;
    if (!confirm("Delete this entry permanently?")) return;
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    onDeleted();
  };

  const togglePin = async () => {
    if (!entry) return;
    queueSave({ pinned: !entry.pinned });
  };

  const scoreNow = async () => {
    if (!entry) return;
    setScoring(true);
    if (!entry.analyze_for_mirror) {
      await supabase.from("journal_entries").update({ analyze_for_mirror: true }).eq("id", entry.id);
    }
    const { error } = await supabase.functions.invoke("journal-score-entry", { body: { entry_id: entry.id } });
    setScoring(false);
    if (error) toast({ title: "Couldn't score", description: error.message, variant: "destructive" });
    else toast({ title: "Entry scored — see Worldview Mirror" });
    onChanged();
  };

  if (!entry) {
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

  const dt = new Date(entry.entry_at_ts);
  const dateLabel = dt.toLocaleString(undefined, {
    month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

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
        <TBtn title="Tags" onClick={() => setShowMeta(true)}><Tag className="w-4 h-4" /></TBtn>
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

          <Textarea
            ref={bodyRef}
            value={entry.body}
            onChange={(e) => queueSave({ body: e.target.value })}
            placeholder="What happened today? What are you carrying?"
            className="min-h-[60vh] border-0 px-0 focus-visible:ring-0 shadow-none resize-none font-serif text-[16px] leading-relaxed"
          />

          {showMeta && (
            <div className="mt-6 space-y-4 pt-4 border-t border-border/40">
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