import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { CalendarDays, SquarePen, Search, Sparkles, Flame, BookOpen } from "lucide-react";
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

  const totalEntries = entries.length;

  return (
    <JournalLayout
      title="Journal"
      right={
        <>
          <Link
            to="/journal/calendar"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted"
            title="Calendar"
          >
            <CalendarDays className="w-[22px] h-[22px]" strokeWidth={2} />
          </Link>
          <button
            onClick={() => navigate("/journal/new")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted"
            title="New entry"
          >
            <SquarePen className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
        </>
      }
    >
      {/* iOS-style search field */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="pl-9 h-10 rounded-xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
      </div>

      {/* Stats strip — iOS Health/Fitness style cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <StatCard
          icon={<Flame className="w-5 h-5" strokeWidth={2.2} />}
          tint="from-orange-400 to-rose-500"
          value={streaks.current}
          label={`Day${streaks.current === 1 ? "" : "s"} streak`}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5" strokeWidth={2.2} />}
          tint="from-sky-400 to-blue-600"
          value={totalEntries}
          label={totalEntries === 1 ? "Entry" : "Entries"}
        />
        <Link to="/journal/mirror" className="block">
          <StatCard
            icon={<Sparkles className="w-5 h-5" strokeWidth={2.2} />}
            tint="from-violet-400 to-fuchsia-500"
            value="Mirror"
            label="Worldview"
            small
          />
        </Link>
      </div>

      {/* Tag filter chips — iOS pill style */}
      {allTags.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <Chip active={!activeTag} onClick={() => setActiveTag(null)}>All</Chip>
          {allTags.map(([t, n]) => (
            <Chip key={t} active={activeTag === t} onClick={() => setActiveTag(activeTag === t ? null : t)}>
              #{t} <span className="opacity-60 ml-0.5">{n}</span>
            </Chip>
          ))}
        </div>
      )}

      {grouped.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <SquarePen className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <p className="text-lg font-semibold tracking-tight">Start writing</p>
          <p className="text-[15px] text-muted-foreground mt-1">Capture today in a new entry.</p>
          <Button onClick={() => navigate("/journal/new")} className="mt-5 rounded-full px-5 h-10">
            New Entry
          </Button>
        </div>
      )}

      <div className="space-y-7">
        {grouped.map(([month, list]) => (
          <section key={month}>
            <h2 className="text-[13px] font-semibold text-muted-foreground tracking-tight mb-2 px-1">
              {formatMonth(month)}
            </h2>
            <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden divide-y divide-border/50">
              {list.map((e) => (
                <Link
                  key={e.id}
                  to={`/journal/${e.id}`}
                  className="flex gap-3 p-3 active:bg-muted/60 transition-colors"
                >
                  {photoUrls[e.id] ? (
                    <img
                      src={photoUrls[e.id]}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-muted to-muted/40 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {dayMonth(e.entry_at_ts).month}
                      </span>
                      <span className="text-xl font-bold leading-none -mt-0.5">
                        {dayMonth(e.entry_at_ts).day}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-0.5">
                      <span>{formatTime(e.entry_at_ts)}</span>
                      {e.mood !== null && moodMeta(e.mood) && (
                        <span className={moodMeta(e.mood)!.color}>· {moodMeta(e.mood)!.label}</span>
                      )}
                      {e.location_name && <span className="truncate">· {e.location_name}</span>}
                      {e.analyze_for_mirror && <Sparkles className="w-3 h-3 text-violet-500" />}
                    </div>
                    {e.title && (
                      <h3 className="text-[15px] font-semibold tracking-tight truncate">{e.title}</h3>
                    )}
                    <p className="text-[14px] text-foreground/70 line-clamp-2 leading-snug">
                      {e.body || <span className="italic text-muted-foreground">No body</span>}
                    </p>
                    {(e.tags.length > 0 || e.verse_ref) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {e.verse_ref && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                            {e.verse_ref}
                          </span>
                        )}
                        {e.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
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

      {/* Floating compose button — iOS-style */}
      <button
        onClick={() => navigate("/journal/new")}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="New entry"
      >
        <SquarePen className="w-6 h-6" strokeWidth={2.2} />
      </button>
    </JournalLayout>
  );
}

function StatCard({
  icon,
  tint,
  value,
  label,
  small,
}: {
  icon: React.ReactNode;
  tint: string;
  value: string | number;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-3 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tint} text-white flex items-center justify-center shadow-sm`}>
        {icon}
      </div>
      <div>
        <div className={`${small ? "text-[15px]" : "text-[22px]"} font-bold leading-none tracking-tight`}>
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{label}</div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[13px] font-medium px-3 h-7 rounded-full whitespace-nowrap transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80 hover:bg-muted/70"
      }`}
    >
      {children}
    </button>
  );
}

function dayMonth(ts: string) {
  const d = new Date(ts);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
  };
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
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