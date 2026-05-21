import { Link, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Clock,
  FileStack,
  LayoutGrid,
  List,
  Menu,
  Network,
  Plus,
  Share2,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AiWritingAssistToggle from "@/components/writing/AiWritingAssistToggle";
import { cn } from "@/lib/utils";
import type { LibraryCategoryId, LibrarySortKey, LibraryViewMode } from "./artifactLibraryModel";
import { LIBRARY_CATEGORY_CHIPS } from "./artifactLibraryModel";

const FRAMEWORK_NAV = [
  { to: "/framework", label: "Overview", icon: Sparkles },
  { to: "/framework/journey", label: "Journey", icon: Sprout },
  { to: "/framework/playbook", label: "Playbook", icon: ClipboardList },
  { to: "/framework/artifacts", label: "Artifacts", icon: FileStack },
  { to: "/framework/research-later", label: "Research later", icon: Clock },
  { to: "/framework/graph", label: "Graph", icon: Share2 },
  { to: "/framework/beliefs", label: "Beliefs", icon: Network },
  { to: "/framework/influences", label: "Influences", icon: Users },
  { to: "/framework/tensions", label: "Tensions", icon: AlertTriangle },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showNewArtifact: boolean;
  viewMode: LibraryViewMode;
  onViewModeChange: (m: LibraryViewMode) => void;
  sortKey: LibrarySortKey;
  onSortKeyChange: (s: LibrarySortKey) => void;
  category: LibraryCategoryId;
  onCategoryChange: (c: LibraryCategoryId) => void;
};

export function ArtifactsLibraryMobileMenu({
  open,
  onOpenChange,
  showNewArtifact,
  viewMode,
  onViewModeChange,
  sortKey,
  onSortKeyChange,
  category,
  onCategoryChange,
}: Props) {
  const { pathname } = useLocation();

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg border-border/60 shadow-sm"
          aria-label="Open artifacts menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[min(100%,320px)] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border/60 px-4 py-3 text-left">
          <SheetTitle className="font-display text-base font-normal">Artifacts</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {showNewArtifact ? (
            <div className="mb-4 px-1">
              <Button asChild className="w-full rounded-xl font-semibold shadow-sm">
                <Link
                  to="/framework/artifacts/new"
                  onClick={close}
                  className="inline-flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  New artifact
                </Link>
              </Button>
            </div>
          ) : null}

          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Framework
          </p>
          <nav className="mb-4 flex flex-col gap-0.5" aria-label="Framework sections">
            {FRAMEWORK_NAV.map((n) => {
              const active =
                n.to === "/framework" ? pathname === "/framework" : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-muted/60 text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            View
          </p>
          <div
            className="mb-4 inline-flex w-full rounded-xl border border-border/60 bg-muted/25 p-0.5 shadow-sm"
            role="group"
            aria-label="View layout"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 flex-1 gap-1.5 rounded-lg",
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
                "h-9 flex-1 gap-1.5 rounded-lg",
                viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" aria-hidden />
              List
            </Button>
          </div>

          <label className="mb-1 block px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground" htmlFor="artifact-sort-mobile">
            Sort
          </label>
          <select
            id="artifact-sort-mobile"
            value={sortKey}
            onChange={(e) => onSortKeyChange(e.target.value as LibrarySortKey)}
            className="mb-4 h-10 w-full rounded-xl border border-border/60 bg-muted/20 px-3 text-sm font-medium text-foreground shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="recent">Recently added</option>
            <option value="az">A–Z</option>
            <option value="source">Source</option>
          </select>

          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Filter
          </p>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by type">
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

          <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Tools
          </p>
          <div className="space-y-3 px-1">
            <AiWritingAssistToggle />
            <Link
              to="/read/Jhn/1"
              onClick={close}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
            >
              <BookOpen className="h-4 w-4 opacity-80" aria-hidden />
              Reader
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
