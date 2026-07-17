import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import JournalHandwritingScriptureNote from "@/components/journal/JournalHandwritingScriptureNote";
import { Input } from "@/components/ui/input";
import { fetchEntryListMediaUrls } from "@/lib/journal/entryListMedia";
import { useIsDesktop } from "@/hooks/use-desktop";
import {
  ensureDefaultJournal,
  getDefaultJournalId,
  Journal,
  pickDefaultJournalId,
} from "@/lib/journal/journals";
import { getNotesJournalId, isNotesJournal } from "@/lib/journal/notesJournal";
import { scheduleEntryContextEnrichment } from "@/lib/journal/context";
import { insertJournalEntry } from "@/lib/journal/journalEntryDb";
import {
  deleteJournalEntry,
  setJournalEntryMirrorFlag,
  setJournalEntryPinned,
} from "@/lib/journal/entryActions";
import { toast } from "@/hooks/use-toast";
import { formatJournalLoadError } from "@/lib/journal/journalE2eSchema";
import { useJournalTitleBackfill } from "@/hooks/useJournalTitleBackfill";
import DayOneImportDialog from "@/components/journal/DayOneImportDialog";
import {
  fetchJournalEntryListPage,
  JOURNAL_LIST_PAGE_SIZE,
  type JournalEntryListRow,
} from "@/lib/journal/entryListQuery";
import {
  journalDeskEntryHref,
  journalEntryHref,
  journalNewEntryEditHref,
} from "@/lib/journal/entryNavigation";
import { JOURNAL_PURPOSE } from "@/lib/journal/journalPurpose";
import { Button } from "@/components/ui/button";

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
  const [notesJournalId, setNotesJournalId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dayOneImportOpen, setDayOneImportOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const createNavGenRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    ensureDefaultJournal(user.id).then(setJournals);
    getNotesJournalId(user.id).then(setNotesJournalId);
  }, [user]);

  const refreshJournals = useCallback(async () => {
    if (!user) return;
    setJournals(await ensureDefaultJournal(user.id));
  }, [user]);

  const createNew = async () => {
    if (!user || creating) return;
    const navGen = ++createNavGenRef.current;
    setCreating(true);
    try {
      const jid =
        journalId ?? pickDefaultJournalId(journals) ?? (await getDefaultJournalId(user.id));
      const now = new Date();
      const { data, error } = await insertJournalEntry(user.id, {
        journal_id: jid,
        title: null,
        body: "",
        tags: [],
        entry_at_ts: now.toISOString(),
        entry_at: now.toISOString().slice(0, 10),
        analyze_for_mirror: false,
      });
      if (error || !data) {
        toast({
          title: "Couldn't create entry",
          description: error?.message ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      if (navGen !== createNavGenRef.current) return;
      setReloadKey((k) => k + 1);
      if (isDesktop) {
        if (jid) navigate(`/journal/j/${jid}/e/${data.id}`);
        else navigate(`/journal/e/${data.id}`);
      } else {
        navigate(journalNewEntryEditHref(data.id));
      }
      scheduleEntryContextEnrichment(user.id, data.id);
    } finally {
      if (navGen === createNavGenRef.current) setCreating(false);
    }
  };

  const selectEntry = useCallback(
    (id: string, entryKind?: string | null) => {
      createNavGenRef.current += 1;
      navigate(journalDeskEntryHref(id, journalId, entryKind));
    },
    [journalId, navigate],
  );

  const handleEditorChanged = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const activeJournal = journalId ? journals.find((j) => j.id === journalId) ?? null : null;
  const excludeJournalIds =
    !journalId && notesJournalId ? [notesJournalId] : undefined;

  if (isDesktop) {
    return (
      <>
      <div className="flex min-h-0 flex-1 flex-col">
      <JournalDeskLayout
        sidebar={
          <JournalsRail
            inDesk
            journals={journals}
            activeJournalId={journalId}
            onChange={() => {
              void refreshJournals();
              setReloadKey((k) => k + 1);
            }}
            onImportDayOne={() => setDayOneImportOpen(true)}
          />
        }
        list={
            <EntryListPane
              journalId={journalId}
              selectedId={entryId}
              reloadKey={reloadKey}
              excludeJournalIds={excludeJournalIds}
              headingLabel={activeJournal?.name ?? "All entries"}
              onSelect={selectEntry}
              onNew={createNew}
              onDeleted={() => {
                setReloadKey((k) => k + 1);
                navigate(journalId ? `/journal/j/${journalId}` : "/journal");
              }}
            />
        }
        editor={
          !entryId && !journalId ? (
            <AllEntriesOverviewPane
              journals={journals.filter((j) => !isNotesJournal(j))}
              notesJournalId={notesJournalId}
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
              key={entryId ?? "none"}
              entryId={entryId}
              journals={journals}
              onChanged={handleEditorChanged}
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
      </div>
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

  if (!isDesktop && entryId) {
    return <MobileEntryRedirect entryId={entryId} />;
  }

  return <MobileJournalList journalId={journalId} notesJournalId={notesJournalId} />;
}

/** Resolve entry kind then open the correct mobile read/chat route. */
function MobileEntryRedirect({ entryId }: { entryId: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("entry_kind")
        .eq("id", entryId)
        .maybeSingle();
      if (cancelled) return;
      navigate(journalEntryHref(entryId, data?.entry_kind), { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId, navigate]);

  return null;
}

/** Mobile list with swipe actions on each row. */
function MobileJournalList({
  journalId,
  notesJournalId,
}: {
  journalId: string | null;
  notesJournalId: string | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const attachPhotoUrls = useCallback(async (list: JournalEntryListRow[], merge: boolean) => {
    const ids = list.map((e) => e.id);
    if (!ids.length) {
      if (!merge) {
        setPhotoUrls({});
        setVideoUrls({});
      }
      return;
    }
    const { photoUrls: photos, videoUrls: videos } = await fetchEntryListMediaUrls(ids);
    setPhotoUrls((prev) => (merge ? { ...prev, ...photos } : photos));
    setVideoUrls((prev) => (merge ? { ...prev, ...videos } : videos));
  }, []);

  const loadEntries = useCallback(
    async (append = false) => {
      if (!user) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setLoadError(null);
      try {
        const offset = append ? entries.length : 0;
        const { rows, hasMore: more } = await fetchJournalEntryListPage(supabase, {
          journalId,
          excludeJournalIds:
            !journalId && notesJournalId ? [notesJournalId] : undefined,
          offset,
          limit: JOURNAL_LIST_PAGE_SIZE,
        });
        setHasMore(more);
        setEntries((prev) => (append ? [...prev, ...(rows as Entry[])] : (rows as Entry[])));
        await attachPhotoUrls(rows, append);
      } catch (e) {
        const msg = formatJournalLoadError(e);
        setLoadError(msg);
        toast({ title: "Couldn't load entries", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, journalId, notesJournalId, entries.length, attachPhotoUrls],
  );

  useEffect(() => {
    void loadEntries(false);
  }, [user, journalId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when journal scope changes

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
    <JournalShell journalId={journalId} activeTab="list" totalCount={entries.length} subtitle={JOURNAL_PURPOSE}>
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

      <div className="px-5 pb-3">
        <JournalHandwritingScriptureNote
          compact
          onStart={() => navigate(`/journal/new${journalId ? `?journalId=${journalId}` : ""}`)}
        />
      </div>

      {loadError && filtered.length === 0 && (
        <div className="text-center py-16 px-6">
          <p className="text-[15px] font-semibold">Couldn&apos;t load entries</p>
          <p className="text-sm text-muted-foreground mt-1 mb-3">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => void loadEntries(false)}>
            Try again
          </Button>
        </div>
      )}

      {loading && entries.length === 0 && !loadError && (
        <div className="text-center py-20 px-6 text-muted-foreground text-sm">Loading…</div>
      )}

      {!loading && filtered.length === 0 && !loadError && (
        <div className="text-center py-20 px-6">
          <p className="text-lg font-semibold tracking-tight">No entries yet</p>
          <p className="text-[15px] text-muted-foreground mt-1 mb-4">
            Write your first entry or tap the compose button.
          </p>
          <Button
            onClick={() =>
              navigate(`/journal/new${journalId ? `?journalId=${journalId}` : ""}`)
            }
          >
            Start journaling
          </Button>
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
                entry={{ ...e, photo_url: photoUrls[e.id], video_url: videoUrls[e.id] }}
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
                entry={{ ...e, photo_url: photoUrls[e.id], video_url: videoUrls[e.id] }}
                onPin={() => handlePin(e.id, e.pinned)}
                onFlag={() => handleFlag(e.id, e.analyze_for_mirror)}
                onDelete={() => handleDelete(e.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {hasMore && !q.trim() && (
        <div className="px-5 py-6 text-center">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => void loadEntries(true)}
          >
            {loadingMore ? "Loading…" : "Load more entries"}
          </Button>
        </div>
      )}
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