import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pin, Plus, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatJournalLoadError } from "@/lib/journal/journalE2eSchema";
import { fetchNotesListPage, type NotesListRow } from "@/lib/journal/notesEntryQuery";
import {
  formatNoteListDate,
  noteDateGroup,
  noteDisplayPreview,
  noteDisplayTitle,
  NOTE_GROUP_LABELS,
  type NoteDateGroup,
} from "@/lib/journal/notesDisplay";
import { setJournalEntryPinned } from "@/lib/journal/entryActions";
import { cn } from "@/lib/utils";

const GROUP_ORDER: NoteDateGroup[] = ["pinned", "today", "yesterday", "previous7", "older"];

type Props = {
  notesJournalId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleted?: (id: string) => void;
  reloadKey?: number;
};

export default function NotesListPane({
  notesJournalId,
  selectedId,
  onSelect,
  onNew,
  onDeleted: _onDeleted,
  reloadKey = 0,
}: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<NotesListRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { rows: next } = await fetchNotesListPage(supabase, notesJournalId, {
        search: q.trim() || undefined,
        limit: 200,
      });
      setRows(next);
    } catch (e) {
      setLoadError(formatJournalLoadError(e));
    } finally {
      setLoading(false);
    }
  }, [user, notesJournalId, q]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const grouped = useMemo(() => {
    const map = new Map<NoteDateGroup, NotesListRow[]>();
    for (const row of rows) {
      const g = noteDateGroup(row.updated_at || row.entry_at_ts, row.pinned);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(row);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [rows]);

  const handlePin = async (id: string, pinned: boolean) => {
    if (!user) return;
    const next = !pinned;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, pinned: next } : r)));
    const { error } = await setJournalEntryPinned(id, user.id, next);
    if (error) {
      toast({ title: "Couldn't pin note", description: error.message, variant: "destructive" });
      void load();
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border/60 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h1 className="text-[17px] font-bold tracking-tight">Notes</h1>
          <button
            type="button"
            onClick={onNew}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(48_96%_53%)] text-[hsl(30_30%_20%)] shadow-sm hover:opacity-90"
            aria-label="New note"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-9 pl-8 bg-muted/50 border-0"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="journal-pane-scroll min-h-0 flex-1 overflow-y-auto">
        {loading && rows.length === 0 && !loadError ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        {loadError ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">{loadError}</div>
        ) : null}
        {!loading && !loadError && rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[15px] font-medium">No notes</p>
            <p className="mt-1 text-sm text-muted-foreground">Tap + to capture a thought.</p>
          </div>
        ) : null}
        {grouped.map(([group, list]) => (
          <section key={group}>
            <h2 className="sticky top-0 z-10 bg-background/90 px-4 py-1.5 text-[12px] font-semibold text-muted-foreground backdrop-blur-sm">
              {NOTE_GROUP_LABELS[group]}
            </h2>
            <ul>
              {list.map((row) => {
                const title = noteDisplayTitle(row.title, row.body);
                const preview = noteDisplayPreview(row.title, row.body);
                const active = selectedId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        void handlePin(row.id, row.pinned);
                      }}
                      className={cn(
                        "w-full border-b border-border/40 px-4 py-2.5 text-left transition-colors",
                        active ? "bg-[hsl(48_96%_53%/_0.25)]" : "hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {row.pinned ? (
                              <Pin className="h-3 w-3 shrink-0 text-amber-600 fill-amber-500" aria-hidden />
                            ) : null}
                            <p className="truncate text-[15px] font-semibold leading-snug">{title}</p>
                          </div>
                          {preview ? (
                            <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground leading-snug">
                              {preview}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums pt-0.5">
                          {formatNoteListDate(row.updated_at || row.entry_at_ts)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
