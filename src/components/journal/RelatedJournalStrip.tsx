import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { findEntriesLinkedTo, type LinkKind } from "@/lib/journal/links";

interface Row {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string;
}

interface Props {
  kind: LinkKind;
  refMatch: Record<string, unknown>;
  /** Where the "New entry" button should send people. */
  newEntryHref?: string;
  title?: string;
}

/**
 * Horizontal strip showing journal entries linked to a target (belief / verse /
 * tension / etc.). Lives on Belief detail, Reader, Tensions, Daily, Study.
 */
export default function RelatedJournalStrip({
  kind,
  refMatch,
  newEntryHref,
  title = "From your journal",
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const ids = await findEntriesLinkedTo(kind, refMatch);
      if (!ids.length) {
        setRows([]);
        setLoaded(true);
        return;
      }
      const { data } = await supabase
        .from("journal_entries")
        .select("id,title,body,entry_at_ts")
        .in("id", ids)
        .order("entry_at_ts", { ascending: false })
        .limit(12);
      setRows((data as Row[]) ?? []);
      setLoaded(true);
    })();
  }, [kind, JSON.stringify(refMatch)]);

  if (!loaded) return null;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[12px] uppercase tracking-[0.16em] font-semibold text-muted-foreground inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> {title}
        </h3>
        {newEntryHref && (
          <Link
            to={newEntryHref}
            className="text-xs text-primary inline-flex items-center hover:underline"
          >
            New entry <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">
          No journal entries yet.
          {newEntryHref && (
            <>
              {" "}
              <Link to={newEntryHref} className="text-primary hover:underline">
                Reflect on this →
              </Link>
            </>
          )}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {rows.map((r) => {
            const dt = new Date(r.entry_at_ts);
            return (
              <Link
                key={r.id}
                to={`/journal/${r.id}`}
                className="snap-start flex-shrink-0 w-60 rounded-xl border border-border bg-card p-3 hover:shadow-md transition"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
                {r.title && (
                  <div className="font-semibold text-[14px] leading-snug mb-1 line-clamp-1">
                    {r.title}
                  </div>
                )}
                <p className="text-[13px] text-foreground/75 line-clamp-3 leading-snug">
                  {r.body || "—"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
