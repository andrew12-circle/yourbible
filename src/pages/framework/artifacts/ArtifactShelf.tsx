import { ArtifactTile } from "./ArtifactTile";
import type { LibraryCategoryId, Row } from "./artifactLibraryModel";

interface ArtifactShelfProps {
  shelfKey: string;
  title: string;
  rows: Row[];
  /** When set, shows "See all" and calls handler with this category. */
  seeAllCategory?: LibraryCategoryId | null;
  onSeeAll?: (category: LibraryCategoryId) => void;
  deletingId: string | null;
  onDelete: (id: string, title: string | null) => void;
  onRename: (id: string) => void;
}

export function ArtifactShelf({
  shelfKey,
  title,
  rows,
  seeAllCategory,
  onSeeAll,
  deletingId,
  onDelete,
  onRename,
}: ArtifactShelfProps) {
  const showSeeAll = Boolean(seeAllCategory && onSeeAll);
  const headingId = `artifact-shelf-${shelfKey}`;

  if (rows.length === 0) {
    return (
      <section className="space-y-2" aria-labelledby={headingId}>
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          <h2 id={headingId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
        </div>
        <p className="px-0.5 text-xs text-muted-foreground">No items yet</p>
      </section>
    );
  }

  const showHeader = title.length > 0 || showSeeAll;

  return (
    <section className="space-y-3" aria-labelledby={title ? headingId : undefined}>
      {showHeader ? (
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          {title ? (
            <h2 id={headingId} className="text-base font-semibold tracking-tight">
              {title}
            </h2>
          ) : (
            <span aria-hidden />
          )}
          {showSeeAll && seeAllCategory ? (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => onSeeAll?.(seeAllCategory)}
            >
              See all
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        className="-mx-1 flex overflow-x-auto scroll-smooth pb-2 pt-0.5 touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
        role="list"
      >
        <div className="flex min-w-min gap-3 px-1">
          {rows.map((r) => (
            <div key={r.id} className="shrink-0" role="listitem">
              <ArtifactTile r={r} layout="shelf" deletingId={deletingId} onDelete={onDelete} onRename={onRename} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
