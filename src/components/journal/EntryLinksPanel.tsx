import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Link2, Loader2 } from "lucide-react";
import {
  listEntryBacklinks,
  listEntryLinks,
  type EntryBacklink,
  type EntryLink,
  type LinkKind,
} from "@/lib/journal/links";
import { supabase } from "@/integrations/supabase/client";

function guessBookAbbr(ref: string): string {
  const raw = ref.split(/\s+/)[0]?.toLowerCase().replace(/\./g, "") ?? "";
  const map: Record<string, string> = {
    john: "Jhn", jn: "Jhn", romans: "Rom", rom: "Rom", psalm: "Psa", psa: "Psa",
  };
  return map[raw] ?? "Jhn";
}
function guessChapter(ref: string): number {
  const m = ref.match(/(\d+):/);
  return m ? Number(m[1]) : 1;
}

function OutgoingChip({ link }: { link: EntryLink }) {
  const ref = link.target_ref as Record<string, unknown>;
  const [label, setLabel] = useState(link.target_kind);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      switch (link.target_kind as LinkKind) {
        case "entry": {
          const id = String(ref.entry_id ?? "");
          if (!id) return;
          const { data } = await supabase.from("journal_entries").select("title, entry_at_ts").eq("id", id).maybeSingle();
          if (!cancelled && data) {
            setLabel(data.title?.trim() || new Date(data.entry_at_ts).toLocaleDateString());
          }
          break;
        }
        case "artifact": {
          const id = String(ref.id ?? ref.artifact_id ?? "");
          if (!id) return;
          const { data } = await supabase.from("artifacts").select("title").eq("id", id).maybeSingle();
          if (!cancelled && data?.title) setLabel(data.title);
          break;
        }
        case "belief": {
          const id = String(ref.belief_id ?? ref.id ?? "");
          if (!id) return;
          const { data } = await supabase.from("belief_nodes").select("statement").eq("id", id).maybeSingle();
          if (!cancelled && data?.statement) setLabel(data.statement.slice(0, 48));
          break;
        }
        case "entity": {
          const id = String(ref.entity_id ?? ref.id ?? "");
          if (!id) return;
          const { data } = await supabase.from("knowledge_entities").select("title").eq("id", id).maybeSingle();
          if (!cancelled && data?.title) setLabel(data.title);
          break;
        }
        case "verse":
          setLabel(String(ref.ref ?? "scripture"));
          break;
        default:
          break;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [link]);

  const to = (() => {
    switch (link.target_kind as LinkKind) {
      case "entry": {
        const id = String(ref.entry_id ?? "");
        return id ? `/journal/${id}` : "/journal";
      }
      case "artifact": {
        const id = String(ref.id ?? ref.artifact_id ?? "");
        return id ? `/framework/artifacts/${id}` : "/framework/artifacts";
      }
      case "belief": {
        const id = String(ref.belief_id ?? ref.id ?? "");
        return id ? `/framework/beliefs/${id}` : "/framework/beliefs";
      }
      case "entity":
        return "/framework/influences";
      case "verse": {
        const r = String(ref.ref ?? "");
        return r ? `/read/${guessBookAbbr(r)}/${guessChapter(r)}` : "/";
      }
      case "daily":
        return "/framework/daily";
      case "study":
        return "/framework/study";
      case "tension":
        return "/framework/tensions";
      case "chat_thread":
        return "/my-ai";
      default:
        return "/journal";
    }
  })();

  const kindLabel =
    link.target_kind === "artifact"
      ? "video"
      : link.target_kind === "entry"
        ? "note"
        : link.target_kind;

  return (
    <Link
      to={to}
      className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200 hover:opacity-80 transition inline-flex items-center gap-1"
    >
      <Link2 className="w-3 h-3" />
      <span className="opacity-60">{kindLabel}</span>
      {label}
    </Link>
  );
}

function BacklinkChip({ link }: { link: EntryBacklink }) {
  const label =
    link.source_title?.trim() ||
    (link.source_entry_at_ts
      ? new Date(link.source_entry_at_ts).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "entry");
  return (
    <Link
      to={`/journal/${link.source_entry_id}`}
      className="text-xs px-2.5 py-1 rounded-full bg-violet-100/70 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200 hover:opacity-80 transition inline-flex items-center gap-1"
    >
      <ArrowLeftRight className="w-3 h-3" />
      {label}
    </Link>
  );
}

interface Props {
  entryId: string;
  reloadKey?: number;
  className?: string;
}

/** Outgoing mind-graph links + incoming entry backlinks. */
export default function EntryLinksPanel({ entryId, reloadKey = 0, className }: Props) {
  const [outgoing, setOutgoing] = useState<EntryLink[]>([]);
  const [backlinks, setBacklinks] = useState<EntryBacklink[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    hasLoadedRef.current = false;
    setLoading(true);
    setOutgoing([]);
    setBacklinks([]);
  }, [entryId]);

  useEffect(() => {
    let cancelled = false;
    const showSpinner = !hasLoadedRef.current;
    if (showSpinner) setLoading(true);
    (async () => {
      const [out, back] = await Promise.all([
        listEntryLinks(entryId),
        listEntryBacklinks(entryId),
      ]);
      if (cancelled) return;
      setOutgoing(out);
      setBacklinks(back);
      setLoading(false);
      hasLoadedRef.current = true;
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
              <OutgoingChip key={l.id} link={l} />
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
