import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { LayoutGrid, List, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerRequestCard from "@/components/prayer/PrayerRequestCard";
import PrayerLedgerTable from "@/components/prayer/PrayerLedgerTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrayerRequests } from "@/hooks/usePrayerRequests";
import { PRAYER_STATUSES, PRAYER_STATUS_LABELS } from "@/lib/prayer/statuses";
import { PRAYER_CATEGORIES, PRAYER_CATEGORY_LABELS } from "@/lib/prayer/categories";
import type { PrayerCategory, PrayerRequestRow, PrayerRequestStatus } from "@/lib/prayer/types";

const STATUS_FILTERS: { id: PrayerRequestStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  ...PRAYER_STATUSES.map((s) => ({ id: s, label: PRAYER_STATUS_LABELS[s] })),
];

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function PrayerRequestsListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialStatus = (params.get("status") as PrayerRequestStatus | null) ?? "all";
  const [statusFilter, setStatusFilter] = useState<PrayerRequestStatus | "all">(
    STATUS_FILTERS.some((f) => f.id === initialStatus) ? initialStatus : "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<PrayerCategory | "all">("all");
  const [view, setView] = useState<"ledger" | "cards">("ledger");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const { rows, loading: listLoading } = usePrayerRequests(user?.id, {
    status: statusFilter,
    category: categoryFilter,
  });

  const monthOptions = useMemo(() => {
    const keys = new Set(rows.map((r) => monthKey(r.requested_at)));
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const sorted = useMemo(() => {
    let list = [...rows].sort((a, b) => b.requested_at.localeCompare(a.requested_at));
    if (monthFilter !== "all") {
      list = list.filter((r) => monthKey(r.requested_at) === monthFilter);
    }
    return list;
  }, [rows, monthFilter]);

  const markAnswered = (row: PrayerRequestRow) => {
    navigate(`/prayer/requests/${row.id}/celebrate`);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PrayerShell title="Provision ledger">
      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
        Your Müller-style log: item, amount, deadline, purpose, status — then mark answered with what God
        actually provided and the story behind it.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to="/prayer/requests/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add need
          </Link>
        </Button>
        <div className="ml-auto flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setView("ledger")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
              view === "ledger" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Ledger
          </button>
          <button
            type="button"
            onClick={() => setView("cards")}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
              view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" />
            Cards
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setMonthFilter("all")}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
            monthFilter === "all" ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground",
          )}
        >
          All months
        </button>
        {monthOptions.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonthFilter(m)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
              monthFilter === m ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground",
            )}
          >
            {formatMonthLabel(m)}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              statusFilter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
            categoryFilter === "all" ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground",
          )}
        >
          All categories
        </button>
        {PRAYER_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
              categoryFilter === c ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground",
            )}
          >
            {PRAYER_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {listLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">No needs logged yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add what you need — amount, deadline, purpose — and track when God provides.
          </p>
          <Button className="mt-4" onClick={() => navigate("/prayer/requests/new")}>
            Add first need
          </Button>
        </div>
      ) : view === "ledger" ? (
        <PrayerLedgerTable rows={sorted} onMarkAnswered={markAnswered} />
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => (
            <PrayerRequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </PrayerShell>
  );
}
