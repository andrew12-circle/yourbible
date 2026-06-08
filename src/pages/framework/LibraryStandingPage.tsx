import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FileStack, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { BeliefAlignmentBar } from "@/components/framework/BeliefAlignmentBar";
import { Button } from "@/components/ui/button";
import { useLibraryCorpusStats } from "@/hooks/useLibraryCorpusStats";
import {
  artifactDisplayTitle,
  type Row as ArtifactRow,
} from "./artifacts/artifactLibraryModel";
import { beliefAlignmentFromCounts } from "@/lib/framework/artifactCorpusStanding";
import { cn } from "@/lib/utils";

type SortKey = "recent" | "align" | "conflict" | "new";

function sortRows(rows: ReturnType<typeof useLibraryCorpusStats>["rows"], key: SortKey) {
  const copy = [...rows];
  if (key === "recent") {
    return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  if (key === "align") {
    return copy.sort((a, b) => b.agreeCount - a.agreeCount || b.createdAt.localeCompare(a.createdAt));
  }
  if (key === "conflict") {
    return copy.sort((a, b) => b.disagreeCount - a.disagreeCount || b.createdAt.localeCompare(a.createdAt));
  }
  return copy.sort((a, b) => b.newCount - a.newCount || b.createdAt.localeCompare(a.createdAt));
}

function aggregateTotals(rows: ReturnType<typeof useLibraryCorpusStats>["rows"]) {
  return rows.reduce(
    (acc, r) => ({
      agree: acc.agree + r.agreeCount,
      disagree: acc.disagree + r.disagreeCount,
      new: acc.new + r.newCount,
      claims: acc.claims + r.claimCount,
    }),
    { agree: 0, disagree: 0, new: 0, claims: 0 },
  );
}

export default function LibraryStandingPage() {
  const { user, loading: authLoading } = useAuth();
  const { rows, loading, error } = useLibraryCorpusStats(user?.id);
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const sorted = useMemo(() => sortRows(rows, sortKey), [rows, sortKey]);
  const totals = useMemo(() => aggregateTotals(rows), [rows]);
  const corpusAlignment = useMemo(
    () => beliefAlignmentFromCounts(totals.agree, totals.disagree, totals.new),
    [totals],
  );

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Library standing" back="/framework/artifacts">
      <div className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-display text-lg">Where you stand across everything</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every source you&apos;ve analyzed, compared to your beliefs. Open any row for how it echoes the rest of your
          library.
        </p>
        {rows.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Corpus vs. your beliefs ({totals.claims} claims across {rows.length} sources)
            </div>
            <BeliefAlignmentBar alignment={corpusAlignment} />
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Sort by</span>
        {(
          [
            ["recent", "Recent"],
            ["align", "Most aligned"],
            ["conflict", "Most conflict"],
            ["new", "Most new ground"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={sortKey === id ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setSortKey(id)}
          >
            {label}
          </Button>
        ))}
        <Button asChild size="sm" variant="outline" className="ml-auto h-8 text-xs">
          <Link to="/framework/artifacts/new?mode=youtube">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add source
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading library…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <FileStack className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No ready sources yet. Add a video or transcript to start building your map.</p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/framework/artifacts/new?mode=youtube">Add your first source</Link>
          </Button>
        </div>
      ) : null}

      {!loading && !error && sorted.length > 0 ? (
        <ul className="space-y-3">
          {sorted.map((row) => {
            const asArtifact: ArtifactRow = {
              id: row.artifactId,
              title: row.title,
              kind: row.kind,
              status: "ready",
              created_at: row.createdAt,
            };
            const title = artifactDisplayTitle(asArtifact);
            const alignment = beliefAlignmentFromCounts(row.agreeCount, row.disagreeCount, row.newCount);
            return (
              <li key={row.artifactId}>
                <Link
                  to={`/framework/artifacts/${row.artifactId}#library-standing`}
                  className={cn(
                    "block rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border hover:bg-card/90",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 font-semibold leading-snug">{title}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {row.kind} · {new Date(row.createdAt).toLocaleDateString()} · {row.claimCount} claims
                        {row.peerLibraryCount > 0 ? ` · ${row.peerLibraryCount} others in library` : ""}
                      </div>
                    </div>
                  </div>
                  {row.claimCount > 0 ? (
                    <div className="mt-3">
                      <BeliefAlignmentBar alignment={alignment} showLegend={false} />
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </FrameworkLayout>
  );
}
