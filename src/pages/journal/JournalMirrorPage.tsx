import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Conflict {
  belief_id?: string;
  belief_statement?: string;
  axis?: string;
  severity?: number;
  summary: string;
  detail?: string;
  evidence_excerpts?: { entry_id?: string; quote: string }[];
  reflection_prompt?: string;
  percentage?: number;
}
interface Report {
  id: string;
  range_start: string;
  range_end: string;
  kind: string;
  aggregate: Record<string, number>;
  conflicts: Conflict[];
  created_at: string;
}

export default function JournalMirrorPage() {
  const { user, loading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [running, setRunning] = useState(false);
  const [scoredCount, setScoredCount] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("journal_mirror_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setReports(((data as unknown) as Report[]) ?? []);
    const { count } = await supabase
      .from("journal_entry_scores")
      .select("id", { count: "exact", head: true });
    setScoredCount(count ?? 0);
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const runMirror = async () => {
    setRunning(true);
    const { error } = await supabase.functions.invoke("journal-mirror", { body: { kind: "on_demand" } });
    setRunning(false);
    if (error) {
      toast({ title: "Mirror failed", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    toast({ title: "Mirror report ready" });
  };

  return (
    <JournalShell
      journalId={null}
      activeTab="list"
      showTabs={false}
      coverTitle="Worldview mirror"
      backTo="/journal"
      hideComposeFab
    >
      <div className="px-5 pt-3 pb-safe-28">
      <div className="rounded-xl border border-border bg-gradient-to-br from-amber-50 to-rose-50 p-5 mb-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-amber-600" />
          <div className="flex-1">
            <h2 className="font-display text-lg">The mirror</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Compares what you say you believe against the patterns in your journal.
              Only entries marked "Include in worldview mirror" are scanned.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Scored entries: <span className="font-medium text-foreground">{scoredCount}</span>
            </p>
            <Button onClick={runMirror} disabled={running} className="mt-3" size="sm">
              {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running…</> : "Run mirror now"}
            </Button>
          </div>
        </div>
      </div>

      {reports.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          No reports yet. Score a few entries, then run the mirror.
        </p>
      )}

      <div className="space-y-6">
        {reports.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
      </div>
    </JournalShell>
  );
}

function ReportCard({ report }: { report: Report }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        {new Date(report.created_at).toLocaleString()} · {report.kind}
        <span className="ml-2">
          {new Date(report.range_start).toLocaleDateString()} → {new Date(report.range_end).toLocaleDateString()}
        </span>
      </div>

      {report.conflicts.length === 0 && (
        <p className="text-sm text-muted-foreground">No significant conflicts in this period — your stated beliefs and lived patterns are aligned.</p>
      )}

      <div className="space-y-3">
        {report.conflicts.map((c, i) => (
          <ConflictItem key={i} c={c} />
        ))}
      </div>
    </article>
  );
}

function ConflictItem({ c }: { c: Conflict }) {
  const [open, setOpen] = useState(false);
  const sev = c.severity ?? 50;
  const sevColor =
    sev >= 70 ? "bg-red-100 text-red-900 border-red-300" :
    sev >= 40 ? "bg-amber-100 text-amber-900 border-amber-300" :
    "bg-zinc-100 text-zinc-900 border-zinc-300";

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${sevColor} shrink-0`}>
          {sev >= 70 ? "high" : sev >= 40 ? "medium" : "low"}
        </span>
        <div className="flex-1">
          <p className="font-display text-base leading-snug">{c.summary}</p>
          {c.belief_statement && (
            <p className="text-xs text-muted-foreground mt-1">vs. belief: "{c.belief_statement}"</p>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3 text-sm">
          {c.detail && <p className="text-foreground/80 font-serif">{c.detail}</p>}

          {c.evidence_excerpts && c.evidence_excerpts.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Evidence from your entries</p>
              <ul className="space-y-1.5">
                {c.evidence_excerpts.map((ex, i) => (
                  <li key={i} className="text-sm font-serif border-l-2 border-amber-400 pl-3 italic">
                    {ex.entry_id ? (
                      <Link to={`/journal/${ex.entry_id}`} className="hover:underline">
                        "{ex.quote}"
                      </Link>
                    ) : (
                      <>"{ex.quote}"</>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.reflection_prompt && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 mb-1">Reflect</p>
              {c.reflection_prompt}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {c.belief_id && (
              <Link to={`/framework/beliefs/${c.belief_id}`} className="text-xs underline text-muted-foreground hover:text-foreground">
                Open belief
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}