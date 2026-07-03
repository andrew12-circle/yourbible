import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerRequestCard from "@/components/prayer/PrayerRequestCard";
import PrayerLedgerTable from "@/components/prayer/PrayerLedgerTable";
import PrayerLedgerToolbar from "@/components/prayer/PrayerLedgerToolbar";
import { Button } from "@/components/ui/button";
import { usePrayerRequests } from "@/hooks/usePrayerRequests";
import { PRAYER_STATUSES } from "@/lib/prayer/statuses";
import type { PrayerCategory, PrayerRequestRow, PrayerRequestStatus } from "@/lib/prayer/types";

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
  const initialStatus = params.get("status");
  const [statusFilter, setStatusFilter] = useState<PrayerRequestStatus | "all">(() => {
    if (!initialStatus || initialStatus === "all") return "all";
    if (PRAYER_STATUSES.includes(initialStatus as PrayerRequestStatus)) {
      return initialStatus as PrayerRequestStatus;
    }
    return "all";
  });
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
    <PrayerShell title="Provision ledger" wide>
      <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
        Your Müller-style log: item, amount, deadline, purpose, status — then mark answered with what God
        actually provided and the story behind it.
      </p>

      <PrayerLedgerToolbar
        view={view}
        onViewChange={setView}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
        monthOptions={monthOptions}
        formatMonthLabel={formatMonthLabel}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />

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
