import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import JournalsRail from "@/components/journal/JournalsRail";
import JournalDeskLayout from "@/components/journal/JournalDeskLayout";
import EntryListPane from "@/components/journal/EntryListPane";
import EntryEditorPane from "@/components/journal/EntryEditorPane";
import JournalOverviewPane from "@/components/journal/JournalOverviewPane";
import AllEntriesOverviewPane from "@/components/journal/AllEntriesOverviewPane";
import EntryListItem, { EntryListData } from "@/components/journal/EntryListItem";
import { Input } from "@/components/ui/input";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import { useIsDesktop } from "@/hooks/use-desktop";
import { ensureDefaultJournal, getDefaultJournalId, Journal } from "@/lib/journal/journals";
import { getCurrentContext } from "@/lib/journal/context";
import {
  deleteJournalEntry,
  setJournalEntryMirrorFlag,
  setJournalEntryPinned,
} from "@/lib/journal/entryActions";
import { toast } from "@/hooks/use-toast";
import { useJournalTitleBackfill } from "@/hooks/useJournalTitleBackfill";
import DayOneImportDialog from "@/components/journal/DayOneImportDialog";

interface Entry extends EntryListData {
  journal_id: string | null;
}

export default function JournalPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ journalId?: string; entryId?: string }>();
  const journalId = params.journalId ?? null;
  const entryId = params.entryId ?? null;
  const isDesktop = useIsDesktop();

  // Desktop: 3-pane shell
  const [journals, setJournals] = useState<Journal[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [dayOneImportOpen, setDayOneImportOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    ensureDefaultJournal(user.id).then(setJournals);
  }, [user, reloadKey]);

  const createNew = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const jid = journalId ?? (await getDefaultJournalId(user.id));
      const ctx = await getCurrentContext().catch(() => ({} as Record<string, never>));
      const now = new Date();
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          journal_id: jid,
          title: null,
          body: "",
          tags: [],
          entry_at_ts: now.toISOString(),
          entry_at: now.toISOString().slice(0, 10),
          analyze_for_mirror: false,
          location_name: ctx.location_name ?? null,
          lat: ctx.lat ?? null,
          lng: ctx.lng ?? null,
          weather: ctx.weather ?? null,
          weather_temp_c: ctx.weather_temp_c ?? null,
          weather_icon: ctx.weather_icon ?? null,
        })
        .select("id")
        .maybeSingle();
      if (error || !data) {
        toast({
          title: "Couldn't create entry",
          description: error?.message ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      setReloadKey((k) => k + 1);
      if (jid) navigate(`/journal/j/${jid}/e/${data.id}`);
      else navigate(`/journal/e/${data.id}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const activeJournal = journalId ? journals.find((j) => j.id === journalId) ?? null : null;

  if (isDesktop) {
    return (
      <>
      <JournalDeskLayout
        sidebar={
          <JournalsRail
            journals={journals}
            activeJournalId={journalId}
            onChange={() => setReloadKey((k) => k + 1)}
            onImportDayOne={() => setDayOneImportOpen(true)}
          />
        }
        list={
          <div className="relative flex flex-col h-full">
            <EntryListPane
              journalId={journalId}
              selectedId={entryId}
              reloadKey={reloadKey}
              onSelect={(id) =>
                journalId
                  ? navigate(`/journal/j/${journalId}/e/${id}`)
                  : navigate(`/journal/e/${id}`)
              }
              onNew={createNew}
              onDeleted={() => {
                setReloadKey((k) => k + 1);
                navigate(journalId ? `/journal/j/${journalId}` : "/journal");
              }}
            />
          </div>
        }
        editor={
          !entryId && !journalId ? (
            <AllEntriesOverviewPane
              journals={journals}
              reloadKey={reloadKey}
              onNew={createNew}
              onImportDayOne={() => setDayOneImportOpen(true)}
            />
          ) : activeJournal && !entryId ? (
            <JournalOverviewPane
              journal={activeJournal}
              reloadKey={reloadKey}
              onNew={createNew}
              onImportDayOne={() => setDayOneImportOpen(true)}
              onJournalChange={async () => {
                if (!user) return;
                const list = await ensureDefaultJournal(user.id);
                setJournals(list);
                setReloadKey((k) => k + 1);
              }}
            />
          ) : (
            <EntryEditorPane
              entryId={entryId}
              journals={journals}
              onChanged={() => setReloadKey((k) => k + 1)}
              onClose={() =>
                journalId ? navigate(`/journal/j/${journalId}`) : navigate("/journal")
              }
              onNew={createNew}
              onDeleted={() => {
                setReloadKey((k) => k + 1);
                navigate(journalId ? `/journal/j/${journalId}` : "/journal");
              }}
            />
          )
        }
      />
      <DayOneImportDialog
        open={dayOneImportOpen}
        onOpenChange={setDayOneImportOpen}
        journals={journals}
        defaultJournalId={journalId}
        onImported={(id) => {
          setReloadKey((k) => k + 1);
          if (id) navigate(`/journal/j/${id}`);
        }}
      />
      </>
    );
  }

  return <MobileJournalList journalId={journalId} />;
}

/** Mobile list with swipe actions on each row. */
function MobileJournalList({ journalId }: { journalId: string | null }) {
  const { user } = useAuth();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  const loadEntries = useCallback(async () => {
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
    query = query.or("entry_kind.is.null,entry_kind.neq.vent");
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
  }, [user, journalId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const patchEntry = useCallback((id: string, patch: Partial<Entry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const applySuggestedTitle = useCallback(
    (id: string, title: string) => patchEntry(id, { title }),
    [patchEntry],
  );
  useJournalTitleBackfill(entries, applySuggestedTitle);

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
    },
    [user],
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

  return (
    <JournalShell journalId={journalId} activeTab="list" totalCount={entries.length}>
      <div className="px-5 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="pl-9 h-9 rounded-[10px] bg-muted/70 border-0 text-[15px] placeholder:text-muted-foreground/70 focus-visible:ring-0"
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
        <section className="mb-1">
          <h2 className="sticky top-[var(--safe-area-inset-top)] z-10 px-5 py-1.5 text-[13px] font-semibold tracking-tight text-foreground/90 bg-background/85 backdrop-blur-xl border-b border-border/40">
            Pinned
          </h2>
          <div className="divide-y divide-border/40">
            {pinned.map((e) => (
              <EntryListItem
                key={e.id}
                entry={{ ...e, photo_url: photoUrls[e.id] }}
                onPin={() => handlePin(e.id, e.pinned)}
                onFlag={() => handleFlag(e.id, e.analyze_for_mirror)}
                onDelete={() => handleDelete(e.id)}
              />
            ))}
          </div>
        </section>
      )}

      {grouped.map(([month, list]) => (
        <section key={month}>
          <h2 className="sticky top-[var(--safe-area-inset-top)] z-10 px-5 py-1.5 text-[13px] font-semibold tracking-tight text-foreground/90 bg-background/85 backdrop-blur-xl border-b border-border/40">
            {formatMonth(month)}
          </h2>
          <div className="divide-y divide-border/40">
            {list.map((e) => (
              <EntryListItem
                key={e.id}
                entry={{ ...e, photo_url: photoUrls[e.id] }}
                onPin={() => handlePin(e.id, e.pinned)}
                onFlag={() => handleFlag(e.id, e.analyze_for_mirror)}
                onDelete={() => handleDelete(e.id)}
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