import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import EntryListItem, { EntryListData } from "@/components/journal/EntryListItem";
import { Input } from "@/components/ui/input";
import { getSignedPhotoUrls } from "@/lib/journal/photos";

interface Entry extends EntryListData {
  journal_id: string | null;
}

export default function JournalPage() {
  const { user, loading } = useAuth();
  const { journalId: paramJournalId } = useParams<{ journalId?: string }>();
  const journalId = paramJournalId ?? null;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      let query = supabase
        .from("journal_entries")
        .select(
          "id,title,body,entry_at_ts,mood,location_name,weather,weather_temp_c,weather_icon,pinned,analyze_for_mirror,journal_id",
        )
        .order("pinned", { ascending: false })
        .order("entry_at_ts", { ascending: false })
        .limit(300);
      if (journalId) query = query.eq("journal_id", journalId);
      const { data } = await query;
      const list = (data as Entry[]) ?? [];
      setEntries(list);

      // First photo per entry
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
      }
    })();
  }, [user, journalId]);

  const filtered = useMemo(() => {
    if (!q.trim()) return entries;
    const n = q.toLowerCase();
    return entries.filter(
      (e) =>
        (e.title ?? "").toLowerCase().includes(n) || e.body.toLowerCase().includes(n),
    );
  }, [entries, q]);

  const pinned = filtered.filter((e) => e.pinned);
  const rest = filtered.filter((e) => !e.pinned);

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of rest) {
      const key = e.entry_at_ts.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [rest]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <JournalShell journalId={journalId} activeTab="list" totalCount={entries.length}>
      <div className="px-5 pt-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="pl-9 h-10 rounded-xl bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 px-6">
          <p className="text-lg font-semibold tracking-tight">No entries yet</p>
          <p className="text-[15px] text-muted-foreground mt-1">
            Tap the compose button to write your first.
          </p>
        </div>
      )}

      {pinned.length > 0 && (
        <section className="mb-2">
          <h2 className="px-5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Pinned
          </h2>
          <div className="bg-card divide-y divide-border/50">
            {pinned.map((e) => (
              <EntryListItem
                key={e.id}
                entry={{ ...e, photo_url: photoUrls[e.id] }}
              />
            ))}
          </div>
        </section>
      )}

      {grouped.map(([month, list]) => (
        <section key={month} className="mb-2">
          <h2 className="px-5 pt-4 pb-1 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            {formatMonth(month)}
          </h2>
          <div className="bg-card divide-y divide-border/50">
            {list.map((e) => (
              <EntryListItem
                key={e.id}
                entry={{ ...e, photo_url: photoUrls[e.id] }}
              />
            ))}
          </div>
        </section>
      ))}
    </JournalShell>
  );
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}