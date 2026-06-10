import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Link2, Loader2 } from "lucide-react";
import {
  listEntryBacklinks,
  listOutgoingEntryLinks,
  type EntryBacklink,
  type EntryLink,
} from "@/lib/journal/links";
import { supabase } from "@/integrations/supabase/client";

function entryLabel(title: string | null, entryAt: string | null, id: string): string {
  if (title?.trim()) return title.trim();
  if (entryAt) {
    return new Date(entryAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  return id.slice(0, 8);
}

function OutgoingEntryChip({ link }: { link: EntryLink }) {
  const ref = link.target_ref as { entry_id?: string };
  const targetId = ref.entry_id;
  const [label, setLabel] = useState(targetId?.slice(0, 8) ?? "entry");

  useEffect(() => {
    if (!targetId) return;
    supabase
      .from("journal_entries")
      .select("title, entry_at_ts")
      .eq("id", targetId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLabel(entryLabel(data.title, data.entry_at_ts, targetId));
      });
  }, [targetId]);

  if (!targetId) return null;
  return (
    <Link
      to={`/journal/${targetId}`}
      className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200 hover:opacity-80 transition inline-flex items-center gap-1"
    >
      <Link2 className="w-3 h-3" />
      {label}
    </Link>
  );
}

function BacklinkChip({ link }: { link: EntryBacklink }) {
  return (
    <Link
      to={`/journal/${link.source_entry_id}`}
      className="text-xs px-2.5 py-1 rounded-full bg-violet-100/70 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200 hover:opacity-80 transition inline-flex items-center gap-1"
    >
      <ArrowLeftRight className="w-3 h-3" />
      {entryLabel(link.source_title, link.source_entry_at_ts, link.source_entry_id)}
    </Link>
  );
}

interface Props {
  entryId: string;
  /** Bump to reload after autosave syncs wikilinks. */
  reloadKey?: number;
  className?: string;
}

/** Outgoing wikilinks + incoming backlinks (Reflect-style). */
export default function EntryLinksPanel({ entryId, reloadKey = 0, className }: Props) {
  const [outgoing, setOutgoing] = useState<EntryLink[]>([]);
  const [backlinks, setBacklinks] = useState<EntryBacklink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [out, back] = await Promise.all([
        listOutgoingEntryLinks(entryId),
        listEntryBacklinks(entryId),
      ]);
      if (cancelled) return;
      setOutgoing(out);
      setBacklinks(back);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId, reloadKey]);

  if (loading) {
    return (
      <div className={className}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-label="Loading links" />
      </div>
    );
  }

  if (!outgoing.length && !backlinks.length) return null;

  return (
    <div className={className}>
      {outgoing.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mb-2">
            Links
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {outgoing.map((l) => (
              <OutgoingEntryChip key={l.id} link={l} />
            ))}
          </div>
        </section>
      )}
      {backlinks.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mb-2">
            Backlinks
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {backlinks.map((l) => (
              <BacklinkChip key={l.id} link={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
