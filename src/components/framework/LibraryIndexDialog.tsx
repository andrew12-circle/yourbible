import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Database, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  fetchLibraryIndexStatus,
  LIBRARY_ISSUE_LABELS,
  libraryIndexNeedsWork,
  reindexLibrary,
  type LibraryIndexStatus,
} from "@/lib/framework/libraryIndex";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${warn ? "text-amber-600 dark:text-amber-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default function LibraryIndexDialog({ open, onOpenChange }: Props) {
  const [status, setStatus] = useState<LibraryIndexStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchLibraryIndexStatus();
      setStatus(next);
    } catch (e) {
      toast({
        title: "Could not check library index",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadStatus();
  }, [open, loadStatus]);

  const runReindex = async () => {
    setReindexing(true);
    try {
      let rounds = 0;
      let lastDrain = { processed: 0, succeeded: 0, failed: 0 };
      while (rounds < 8) {
        rounds += 1;
        const result = await reindexLibrary({ drainLimit: 30, drainRounds: 4 });
        lastDrain = result.drain;
        setStatus(result.status);
        const stillPending =
          result.status.summary.embedding_jobs_pending > 0 ||
          result.status.summary.claims_missing_embedding +
            result.status.summary.transcript_chunks_missing_embedding >
            0;
        if (!stillPending || result.drain.processed === 0) break;
      }
      toast({
        title: "Library re-index pass complete",
        description: `Processed ${lastDrain.processed} embedding jobs (${lastDrain.succeeded} succeeded).`,
      });
    } catch (e) {
      toast({
        title: "Re-index failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setReindexing(false);
    }
  };

  const summary = status?.summary;
  const needsWork = summary ? libraryIndexNeedsWork(summary) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Library search index
          </DialogTitle>
          <DialogDescription>
            Lumen finds your saved videos and documents through semantic search on claims and transcript chunks.
            This shows what is indexed and what still needs analysis or embeddings.
          </DialogDescription>
        </DialogHeader>

        {loading && !status ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : summary ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Artifacts" value={summary.artifacts_total} />
              <Stat label="Searchable" value={summary.artifacts_searchable} />
              <Stat label="Needs analysis" value={summary.artifacts_needing_analysis} warn />
              <Stat label="Needs indexing" value={summary.artifacts_needing_embedding} warn />
              <Stat label="Claims unindexed" value={summary.claims_missing_embedding} warn />
              <Stat label="Transcript unindexed" value={summary.transcript_chunks_missing_embedding} warn />
            </div>

            {(summary.embedding_jobs_pending > 0 || summary.embedding_jobs_error > 0) && (
              <p className="text-sm text-muted-foreground">
                Embedding queue: {summary.embedding_jobs_pending} pending
                {summary.embedding_jobs_error > 0 ? ` · ${summary.embedding_jobs_error} failed` : ""}.
              </p>
            )}

            {!needsWork ? (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
                Your library is fully indexed for semantic search.
              </p>
            ) : null}

            {status.issues.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Artifacts needing attention
                </h3>
                <ul className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-border/70">
                  {status.issues.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2 text-sm last:border-0"
                    >
                      <Link
                        to={`/framework/artifacts/${row.id}`}
                        className="min-w-0 truncate font-medium hover:underline"
                        onClick={() => onOpenChange(false)}
                      >
                        {row.title}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {LIBRARY_ISSUE_LABELS[row.issue]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" onClick={() => void runReindex()} disabled={reindexing || loading}>
                {reindexing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Re-index library
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadStatus()} disabled={loading || reindexing}>
                Refresh
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
