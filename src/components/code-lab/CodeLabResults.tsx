import { cn } from "@/lib/utils";
import type { ElsHit, MatrixView } from "@/lib/code-lab/types";
import type { TextProfile } from "@/lib/code-lab/textProfiles";

interface CodeLabMatrixViewerProps {
  matrix: MatrixView | null;
  profile: TextProfile;
  streamLength: number;
}

export function CodeLabMatrixViewer({ matrix, profile, streamLength }: CodeLabMatrixViewerProps) {
  if (!matrix) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Run a search and select a hit to view the skip matrix.
      </div>
    );
  }

  const { columns, rows, cells, seedHit } = matrix;

  const grid: (typeof cells)[0][] = Array.from({ length: rows * columns }, () => ({
    row: 0,
    col: 0,
    streamIndex: -1,
    letter: "",
    highlighted: false,
    isSeed: false,
  }));

  for (const cell of cells) {
    const idx = cell.row * columns + cell.col;
    if (idx >= 0 && idx < grid.length) grid[idx] = cell;
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">Matrix (skip = {columns})</h3>
        <p className="text-xs text-muted-foreground">
          {seedHit.direction} · term {seedHit.term.length} letters · stream {streamLength.toLocaleString()} chars
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Text realigned into {columns} columns — seed letters highlighted (vertical ELS column).
      </p>
      <div
        className="overflow-x-auto"
        dir={profile.isRtl ? "rtl" : "ltr"}
      >
        <div
          className="inline-grid gap-px bg-border font-mono text-sm"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(1.25rem, auto))`,
          }}
        >
          {grid.map((cell, i) => (
            <div
              key={i}
              className={cn(
                "flex h-7 min-w-[1.25rem] items-center justify-center bg-background px-0.5",
                cell.isSeed && "bg-amber-500/25 font-bold text-amber-950 dark:text-amber-100",
                cell.highlighted && !cell.isSeed && "bg-muted",
              )}
              title={cell.streamIndex >= 0 ? `index ${cell.streamIndex}` : undefined}
            >
              {cell.letter || "·"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CodeLabHitListProps {
  hits: ElsHit[];
  compareHits: ElsHit[];
  selectedHit: ElsHit | null;
  onSelect: (hit: ElsHit) => void;
  hasCompare: boolean;
}

export function CodeLabHitList({
  hits,
  compareHits,
  selectedHit,
  onSelect,
  hasCompare,
}: CodeLabHitListProps) {
  if (hits.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground text-center">
        No skip-code matches in this scope.
      </div>
    );
  }

  const compareSkips = new Set(compareHits.map((h) => `${h.skip}:${h.startIndex}`));

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-2 border-b text-sm font-medium">
        {hits.length} hit{hits.length === 1 ? "" : "s"}
      </div>
      <ul className="max-h-64 overflow-y-auto divide-y">
        {hits.slice(0, 100).map((hit) => {
          const key = `${hit.skip}-${hit.direction}-${hit.startIndex}`;
          const inCompare = compareSkips.has(`${hit.skip}:${hit.startIndex}`);
          const selected =
            selectedHit?.skip === hit.skip &&
            selectedHit.startIndex === hit.startIndex &&
            selectedHit.direction === hit.direction;

          return (
            <li key={key}>
              <button
                type="button"
                className={cn(
                  "w-full text-left px-4 py-2 text-sm hover:bg-muted/60 transition-colors",
                  selected && "bg-muted",
                )}
                onClick={() => onSelect(hit)}
              >
                <span className="font-medium">skip {hit.skip}</span>
                <span className="text-muted-foreground"> · {hit.direction}</span>
                <span className="text-muted-foreground"> · index {hit.startIndex}</span>
                {hasCompare && (
                  <span
                    className={cn(
                      "ml-2 text-xs",
                      inCompare ? "text-green-600" : "text-orange-600",
                    )}
                  >
                    {inCompare ? "also in compare" : "not in compare"}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {hits.length > 100 && (
        <p className="px-4 py-2 text-xs text-muted-foreground border-t">
          Showing first 100 of {hits.length} hits.
        </p>
      )}
    </div>
  );
}
