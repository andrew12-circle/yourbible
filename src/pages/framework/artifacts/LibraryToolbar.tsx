import { Link } from "react-router-dom";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LibraryCategoryId, LibrarySortKey, LibraryViewMode } from "./artifactLibraryModel";
import { LIBRARY_CATEGORY_CHIPS } from "./artifactLibraryModel";

interface LibraryToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  viewMode: LibraryViewMode;
  onViewModeChange: (m: LibraryViewMode) => void;
  sortKey: LibrarySortKey;
  onSortKeyChange: (s: LibrarySortKey) => void;
  category: LibraryCategoryId;
  onCategoryChange: (c: LibraryCategoryId) => void;
  showNewArtifact?: boolean;
}

export function LibraryToolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortKey,
  onSortKeyChange,
  category,
  onCategoryChange,
  showNewArtifact = false,
}: LibraryToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="relative w-full md:hidden">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" aria-hidden />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search artifacts…"
          className="h-10 w-full rounded-xl border-border/60 bg-muted/20 pl-9 shadow-sm"
          aria-label="Search artifacts"
        />
      </div>

      <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" aria-hidden />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, channel, guests…"
            className="h-10 rounded-xl border-border/60 bg-muted/20 pl-9 shadow-sm"
            aria-label="Search artifacts"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-xl border border-border/60 bg-muted/25 p-0.5 shadow-sm"
            role="group"
            aria-label="View layout"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 gap-1.5 rounded-lg px-3",
                viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => onViewModeChange("grid")}
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
              Grid
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 gap-1.5 rounded-lg px-3",
                viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" aria-hidden />
              List
            </Button>
          </div>
          <label className="sr-only" htmlFor="artifact-sort">
            Sort artifacts
          </label>
          <select
            id="artifact-sort"
            value={sortKey}
            onChange={(e) => onSortKeyChange(e.target.value as LibrarySortKey)}
            className="h-10 rounded-xl border border-border/60 bg-muted/20 px-3 text-sm font-medium text-foreground shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="recent">Recently added</option>
            <option value="az">A–Z</option>
            <option value="source">Source</option>
          </select>
          {showNewArtifact ? (
            <Button asChild size="default" className="h-10 rounded-xl font-semibold shadow-sm">
              <Link to="/framework/artifacts/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                New artifact
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="hidden flex-wrap gap-2 md:flex" role="tablist" aria-label="Filter by type">
        {LIBRARY_CATEGORY_CHIPS.map((chip) => {
          const active = category === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onCategoryChange(chip.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                active
                  ? "border-border/80 bg-background text-foreground shadow-sm ring-1 ring-border/50"
                  : "border-transparent bg-muted/35 text-muted-foreground hover:bg-muted/55 hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
