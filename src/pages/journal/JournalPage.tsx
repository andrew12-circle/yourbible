import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Calendar, Plus, Search, Sparkles, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalLayout from "./JournalLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { moodMeta } from "@/components/journal/MoodPicker";
import { getSignedPhotoUrls } from "@/lib/journal/photos";

interface Entry {
  id: string;
  title: string | null;
  body: string;
  entry_at: string;
  entry_at_ts: string;
  mood: number | null;
  tags: string[];
  location_name: string | null;
  verse_ref: string | null;
  analyze_for_mirror: boolean;
}

export default function JournalPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({}); // entry_id -> first photo URL
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("id,title,body,entry_at,entry_at_ts,mood,tags,location_name,verse_ref,analyze_for_mirror")
        .order("entry_at_ts", { ascending: false })
        .limit(200);
      const list = (data as Entry[]) ?? [];
      setEntries(list);

      // grab first photo per entry
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
        const paths = Object.values(firstByEntry);
        const urls = await getSignedPhotoUrls(paths);
        const byEntry: Record<string, string> = {};
        for (const [eid, path] of Object.entries(firstByEntry)) {
          if (urls[path]) byEntry[eid] = urls[path];
        }
        setPhotoUrls(byEntry);
      }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (activeTag && !e.tags.includes(activeTag)) return false;
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        (e.title ?? "").toLowerCase().includes(needle) ||
        e.body.toLowerCase().includes(needle) ||
        e.tags.some((t) => t.includes(needle))
      );
    });
  }, [entries, q, activeTag]);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      const key = e.entry_at_ts.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [filtered]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((e) => e.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [entries]);

  const streaks = useMemo(() => computeStreaks(entries.map((e) => e.entry_at)), [entries]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalLayout
      title="Journal"
      right={
        <div className="flex items-center gap-1">
          <Link
            to="/journal/mirror"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-amber-600"
            title="Worldview mirror"
          >
            <Sparkles className="w-4 h-4" />
          </Link>
          <Link
            to="/journal/calendar"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            title="Calendar"
          >
            <Calendar className="w-4 h-4" />
          </Link>
          <Button size="sm" onClick={() => navigate("/journal/new")}>
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>
      }
    >
      <div className="mb-5">
        <div className="rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 border border-border p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current streak</p>
            <p className="text-xl font-display">
              {streaks.current} day{streaks.current === 1 ? "" : "s"}
              <span className="text-xs text-muted-foreground ml-2">best {streaks.best}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search entries…"
          className="pl-9"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${
              !activeTag ? "bg-foreground text-background" : "bg-muted hover:bg-muted/70"
            }`}
          >
            All
          </button>
          {allTags.map(([t, n]) => (
            <button
              key={t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${
                activeTag === t ? "bg-foreground text-background" : "bg-muted hover:bg-muted/70"
              }`}
            >
              #{t} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      )}

      {grouped.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-display text-lg">Your journal is quiet.</p>
          <p className="text-sm mt-1">Tap <span className="font-medium">New</span> to write your first entry.</p>
        </div>
      )}

      <div className="space-y-8">
        {grouped.map(([month, list]) => (
          <section key={month}>
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {formatMonth(month)}
            </h2>
            <div className="space-y-3">
              {list.map((e) => (
                <Link
                  key={e.id}
                  to={`/journal/${e.id}`}
                  className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition"
                >
                  {photoUrls[e.id] && (
                    <img src={photoUrls[e.id]} alt="" className="w-full h-44 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                      <span>{formatDate(e.entry_at_ts)}</span>
                      {e.mood !== null && moodMeta(e.mood) && (
                        <span className={moodMeta(e.mood)!.color}>· {moodMeta(e.mood)!.label}</span>
                      )}
                      {e.location_name && <span>· {e.location_name}</span>}
                      {e.analyze_for_mirror && (
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                    {e.title && <h3 className="font-display text-base mb-1">{e.title}</h3>}
                    <p className="text-sm text-foreground/80 line-clamp-3 font-serif">
                      {e.body || <span className="italic text-muted-foreground">No body</span>}
                    </p>
                    {(e.tags.length > 0 || e.verse_ref) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {e.verse_ref && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                            {e.verse_ref}
                          </span>
                        )}
                        {e.tags.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </JournalLayout>
  );
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function computeStreaks(dates: string[]) {
  if (!dates.length) return { current: 0, best: 0 };
  const set = new Set(dates);
  // Best streak
  const sorted = [...set].sort();
  let best = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      best = Math.max(best, run);
    } else if (diff > 1) {
      run = 1;
    }
  }
  // Current streak (counts back from today or yesterday)
  let current = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = new Date(today);
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, best };
}