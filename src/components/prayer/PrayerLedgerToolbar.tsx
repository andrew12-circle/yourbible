import { Link } from "react-router-dom";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRAYER_STATUSES, PRAYER_STATUS_LABELS } from "@/lib/prayer/statuses";
import { PRAYER_CATEGORIES, PRAYER_CATEGORY_LABELS } from "@/lib/prayer/categories";
import type { PrayerCategory, PrayerRequestStatus } from "@/lib/prayer/types";

const STATUS_FILTERS: { id: PrayerRequestStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  ...PRAYER_STATUSES.map((s) => ({ id: s, label: PRAYER_STATUS_LABELS[s] })),
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap",
        active
          ? "border-border/80 bg-background text-foreground shadow-sm ring-1 ring-border/50"
          : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="w-[4.5rem] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/90">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

type Props = {
  view: "ledger" | "cards";
  onViewChange: (view: "ledger" | "cards") => void;
  monthFilter: string;
  onMonthFilterChange: (month: string) => void;
  monthOptions: string[];
  formatMonthLabel: (ym: string) => string;
  statusFilter: PrayerRequestStatus | "all";
  onStatusFilterChange: (status: PrayerRequestStatus | "all") => void;
  categoryFilter: PrayerCategory | "all";
  onCategoryFilterChange: (category: PrayerCategory | "all") => void;
};

export default function PrayerLedgerToolbar({
  view,
  onViewChange,
  monthFilter,
  onMonthFilterChange,
  monthOptions,
  formatMonthLabel,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
}: Props) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-border/60 bg-muted/10 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2.5 sm:px-4">
        <Button asChild size="sm" className="h-9 rounded-lg font-semibold shadow-sm">
          <Link to="/prayer/requests/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add need
          </Link>
        </Button>
        <div className="flex-1" />
        <div
          className="inline-flex rounded-lg border border-border/60 bg-muted/25 p-0.5 shadow-sm"
          role="group"
          aria-label="View layout"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 rounded-md px-3",
              view === "ledger" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => onViewChange("ledger")}
            aria-pressed={view === "ledger"}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Ledger
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 rounded-md px-3",
              view === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => onViewChange("cards")}
            aria-pressed={view === "cards"}
          >
            <List className="h-3.5 w-3.5" aria-hidden />
            Cards
          </Button>
        </div>
      </div>

      <div className="space-y-2.5 px-3 py-3 sm:px-4">
        <FilterRow label="Month">
          <FilterChip active={monthFilter === "all"} onClick={() => onMonthFilterChange("all")}>
            All months
          </FilterChip>
          {monthOptions.map((m) => (
            <FilterChip key={m} active={monthFilter === m} onClick={() => onMonthFilterChange(m)}>
              {formatMonthLabel(m)}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Status">
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={statusFilter === f.id}
              onClick={() => onStatusFilterChange(f.id)}
            >
              {f.label}
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="Category">
          <FilterChip active={categoryFilter === "all"} onClick={() => onCategoryFilterChange("all")}>
            All
          </FilterChip>
          {PRAYER_CATEGORIES.map((c) => (
            <FilterChip
              key={c}
              active={categoryFilter === c}
              onClick={() => onCategoryFilterChange(c)}
            >
              {PRAYER_CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </FilterRow>
      </div>
    </div>
  );
}
