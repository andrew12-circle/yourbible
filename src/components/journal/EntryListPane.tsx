import { useCallback, useEffect, useMemo, useState } from "react";
import { List, Image as ImgIcon, Calendar, Search, X, Plus, RefreshCw, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { Pin, Sparkles, MapPin } from "lucide-react";
import { moodMeta } from "./MoodPicker";
import { formatTemp } from "@/lib/journal/context";
import { coerceJournalEntryKind, ENTRY_KIND_META, type JournalEntryKind } from "@/lib/journal/entryKinds";
import { entryListPreview, getChatJournalPreview } from "@/lib/journal/chatJournalEntry";
import SwipeableEntryRow from "./SwipeableEntryRow";
import {
  deleteJournalEntry,
  setJournalEntryMirrorFlag,
  setJournalEntryPinned,
} from "@/lib/journal/entryActions";
import { toast } from "@/hooks/use-toast";

interface Entry {
  id: string;
  title: string | null;
  body: string;
  summary: string | null;
  entry_at_ts: string;
  mood: number | null;
  location_name: string | null;
  weather: string | null;
  weather_temp_c: number | null;
  weather_icon: string | null;
  pinned: boolean;
  analyze_for_mirror: boolean;
  journal_id: string | null;
  entry_kind: string | null;
}

type View = "list" | "photos" | "calendar";

export default function EntryListPane({
  journalId,
  selectedId,
  onSelect,
  onNew,
  onDeleted,
  reloadKey,
  entryKindFilter,
}: {
  journalId: string | null;
  selectedId: string | null;
  onSelect: (id: string, entryKind?: string | null) => void;
  onNew: () => void;
  onDeleted?: (id: string) => void;
  reloadKey?: number;
  /** When set, only entries of this faith-journal kind (still respects journalId when set). */
  entryKindFilter?: JournalEntryKind | null;
}) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("list");
  const [searchOpen, setSearchOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    let query = supabase
      .from("journal_entries")
      .select(
        "id,title,body,summary,entry_at_ts,mood,location_name,weather,weather_temp_c,weather_icon,pinned,analyze_for_mirror,journal_id,entry_kind",
      )
      .order("pinned", { ascending: false })
      .order("entry_at_ts", { ascending: false })
      .limit(300);
    if (journalId) query = query.eq("journal_id", journalId);
    if (entryKindFilter) {
      query = query.eq("entry_kind", entryKindFilter);
    } else {
      // Hide vents from the main journal feed — they live only on /journal/vent.
      query = query.or("entry_kind.is.null,entry_kind.neq.vent");
    }
    const { data } = await query;
    const list = (data as Entry[]) ?? [];
    setEntries(list);

    const ids = list.map((e) => e.id);
    if (ids.length) {
      const { data: photos } = await supabase
        .from("journal_photos")
        .select("entry_id,storage_path,created_at")
        .in("entry_id", ids)
        .order("created_at");
      const firstByEntry: Record<string, string> = {};
      (photos ?? []).forEach((p: { entry_id: string; storage_path: string }) => {
        if (!firstByEntry[p.entry_id]) firstByEntry[p.entry_id] = p.storage_path;
      });
      const urls = await getSignedPhotoUrls(Object.values(firstByEntry));
      const byEntry: Record<string, string> = {};
      for (const [eid, p] of Object.entries(firstByEntry)) {
        if (urls[p]) byEntry[eid] = urls[p];
      }
      setPhotoUrls(byEntry);
    } else {
      setPhotoUrls({});
    }
  };

  useEffect(() => { load();   }, [user, journalId, reloadKey, entryKindFilter]);

  const patchEntry = useCallback((id: string, patch: Partial<Entry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const handlePin = useCallback(
    async (id: string, pinned: boolean) => {
      if (!user) return;
      const next = !pinned;
      patchEntry(id, { pinned: next });
      const { error } = await setJournalEntryPinned(id, user.id, next);
      if (error) {
        patchEntry(id, { pinned });
        toast({ title: "Couldn't update pin", description: error.message, variant: "destructive" });
      }
    },
    [user, patchEntry],
  );

  const handleFlag = useCallback(
    async (id: string, flagged: boolean) => {
      if (!user) return;
      const next = !flagged;
      patchEntry(id, { analyze_for_mirror: next });
      const { error } = await setJournalEntryMirrorFlag(id, user.id, next);
      if (error) {
        patchEntry(id, { analyze_for_mirror: flagged });
        toast({ title: "Couldn't update flag", description: error.message, variant: "destructive" });
      }
    },
    [user, patchEntry],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;
      if (!confirm("Delete this entry permanently?")) return;
      const { error } = await deleteJournalEntry(id, user.id);
      if (error) {
        toast({ title: "Couldn't delete entry", description: error.message, variant: "destructive" });
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
      onDeleted?.(id);
    },
    [user, onDeleted],
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return entries;
    const n = q.toLowerCase();
    return entries.filter(
      (e) =>
        (e.title ?? "").toLowerCase().includes(n) ||
        e.body.toLowerCase().includes(n) ||
        (e.location_name ?? "").toLowerCase().includes(n),
    );
  }, [entries, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      const key = e.entry_at_ts.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-12 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center bg-muted rounded-md p-0.5">
          <ToolBtn active={view === "list"} onClick={() => setView("list")} title="List">
            <List className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn active={view === "photos"} onClick={() => setView("photos")} title="Photos">
            <ImgIcon className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn active={view === "calendar"} onClick={() => setView("calendar")} title="Calendar">
            <Calendar className="w-4 h-4" />
          </ToolBtn>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setSearchOpen((s) => !s)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="Search"
        >
          {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </button>
        <button
          onClick={load}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {searchOpen && (
        <div className="px-3 py-2 border-b border-border/60 flex-shrink-0">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search entries…"
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {view === "list" && (
          <>
            {filtered.length === 0 && (
              <div className="text-center py-16 px-6">
                <p className="text-[15px] font-semibold">No entries yet</p>
                <button onClick={onNew} className="mt-3 text-primary text-sm font-medium">
                  Create your first
                </button>
              </div>
            )}
            {grouped.map(([month, list]) => (
              <section key={month}>
                <h2 className="sticky top-0 z-10 px-4 py-1.5 text-[12px] font-semibold tracking-tight text-muted-foreground bg-background/85 backdrop-blur-xl border-b border-border/40">
                  {formatMonth(month)}
                </h2>
                <ul>
                  {list.map((e) => (
                    <li key={e.id}>
                      <EntryRow
                        e={e}
                        active={selectedId === e.id}
                        photoUrl={photoUrls[e.id]}
                        onClick={() => onSelect(e.id, e.entry_kind)}
                        onPin={() => handlePin(e.id, e.pinned)}
                        onFlag={() => handleFlag(e.id, e.analyze_for_mirror)}
                        onDelete={() => handleDelete(e.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
        {view === "photos" && (
          <div className="grid grid-cols-3 gap-1 p-1">
            {filtered
              .filter((e) => photoUrls[e.id])
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() => onSelect(e.id)}
                  className="aspect-square overflow-hidden bg-muted hover:opacity-90"
                >
                  <img src={photoUrls[e.id]} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            {filtered.filter((e) => photoUrls[e.id]).length === 0 && (
              <p className="col-span-3 text-center py-12 text-sm text-muted-foreground">No photos yet</p>
            )}
          </div>
        )}
        {view === "calendar" && (
          <CalendarMini entries={filtered} selectedId={selectedId} onSelect={onSelect} />
        )}
      </div>

      {/* Floating + */}
      <button
        onClick={onNew}
        className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:scale-105 transition"
        style={{ position: "absolute" }}
        aria-label="New entry"
      >
        <Plus className="w-5 h-5" />
      </button>
    </>
  );
}

function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded-[5px] transition-colors ${
        active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EntryRow({
  e, active, photoUrl, onClick, onPin, onFlag, onDelete,
}: {
  e: Entry;
  active: boolean;
  photoUrl?: string;
  onClick: () => void;
  onPin: () => void;
  onFlag: () => void;
  onDelete: () => void;
}) {
  const dt = new Date(e.entry_at_ts);
  const dow = dt.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const day = dt.getDate();
  const time = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const mood = e.mood !== null ? moodMeta(e.mood) : null;
  const tempStr = e.weather_temp_c != null ? formatTemp(e.weather_temp_c) : null;
  const faithKind = coerceJournalEntryKind(e.entry_kind);
  const isChat = e.entry_kind === "chat";

  const content = (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex gap-3 px-4 py-3 border-b border-border/40 transition-colors ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted/30"
      }`}
    >
      <div className={`flex-shrink-0 w-10 text-center pt-0.5 ${active ? "text-primary-foreground" : ""}`}>
        <div className={`text-[10px] font-semibold tracking-[0.12em] ${active ? "opacity-90" : "text-red-500"}`}>
          {dow}
        </div>
        <div className="text-[22px] font-semibold leading-none tracking-tight mt-0.5 tabular-nums">
          {day}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          {e.pinned && <Pin className={`w-3 h-3 mt-1 flex-shrink-0 ${active ? "" : "text-amber-500 fill-amber-500"}`} />}
          <h3 className="text-[14px] font-semibold tracking-tight truncate flex-1 leading-snug">
            {e.title || getChatJournalPreview(e.body, e.summary) || firstLine(e.body) || <span className={`italic font-normal ${active ? "" : "text-muted-foreground"}`}>No title</span>}
          </h3>
          {e.analyze_for_mirror && <Sparkles className={`w-3 h-3 mt-1 flex-shrink-0 ${active ? "" : "text-violet-500"}`} />}
          {isChat && (
            <MessageCircle
              className={`w-3.5 h-3.5 mt-1 flex-shrink-0 ${active ? "text-primary-foreground" : "text-teal-600 dark:text-teal-400"}`}
              aria-hidden
            />
          )}
          {faithKind && (
            <span
              className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/12 text-primary"
              }`}
            >
              {ENTRY_KIND_META[faithKind].label}
            </span>
          )}
        </div>
        <p className={`text-[12px] line-clamp-2 leading-snug ${active ? "opacity-85" : "text-muted-foreground"}`}>
          {entryListPreview(e.body, e.title, e.summary)}
        </p>
        <div className={`text-[11px] mt-1 flex items-center gap-2 flex-wrap ${active ? "opacity-80" : "text-muted-foreground/80"}`}>
          <span className="tabular-nums">{time}</span>
          {e.location_name && (
            <span className="inline-flex items-center gap-0.5 truncate max-w-[40%]">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{e.location_name}</span>
            </span>
          )}
          {tempStr && (
            <span className="inline-flex items-center gap-1">
              {e.weather_icon && <span>{e.weather_icon}</span>}
              <span className="tabular-nums">{tempStr}</span>
            </span>
          )}
          {mood && <span className={active ? "" : mood.color}>{mood.label}</span>}
        </div>
      </div>
      {photoUrl && (
        <img src={photoUrl} alt="" className="flex-shrink-0 w-12 h-12 rounded-md object-cover bg-muted" />
      )}
    </button>
  );

  return (
    <SwipeableEntryRow
      pinned={e.pinned}
      flagged={e.analyze_for_mirror}
      onPin={onPin}
      onFlag={onFlag}
      onDelete={onDelete}
    >
      {content}
    </SwipeableEntryRow>
  );
}

function CalendarMini({ entries, selectedId, onSelect }: {
  entries: Entry[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  // Show last 60 days
  const byDate = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = e.entry_at_ts.slice(0, 10);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(e);
  }
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return (
    <div className="p-2">
      {days.map((d) => {
        const list = byDate.get(d) ?? [];
        if (list.length === 0) return null;
        const dt = new Date(d);
        return (
          <div key={d} className="mb-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
              {dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
            {list.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelect(e.id)}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm truncate ${
                  selectedId === e.id ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"
                }`}
              >
                {e.title || getChatJournalPreview(e.body, e.summary) || firstLine(e.body) || "Untitled"}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function firstLine(s: string) {
  return (s || "").split("\n")[0]?.slice(0, 80) ?? "";
}
function formatMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}