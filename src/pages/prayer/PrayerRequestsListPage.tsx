import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerRequestCard from "@/components/prayer/PrayerRequestCard";
import PrayerLedgerTable from "@/components/prayer/PrayerLedgerTable";
import PrayerLedgerToolbar from "@/components/prayer/PrayerLedgerToolbar";
import { Button } from "@/components/ui/button";
import { usePrayerRequests } from "@/hooks/usePrayerRequests";
import { listScriptureTimelineRefsByRequestIds } from "@/lib/prayer/api";
import { PRAYER_STATUSES } from "@/lib/prayer/statuses";
import { formatLedgerAmount } from "@/lib/prayer/money";
import { provisionSpecificityMissing, remainingProvisionAmount } from "@/lib/prayer/provisionLedger";
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

  const accounting = useMemo(() => {
    const active = sorted.filter((r) => !["answered", "different_answer", "closed"].includes(r.status));
    const knownRemaining = active.reduce((sum, r) => sum + (remainingProvisionAmount(r) ?? 0), 0);
    const criticalRemaining = active
      .filter((r) => r.priority === "critical")
      .reduce((sum, r) => sum + (remainingProvisionAmount(r) ?? 0), 0);
    const needsDetail = active.filter((r) => provisionSpecificityMissing(r).length > 0).length;
    const inMotion = active.filter((r) => r.status === "in_motion").length;
    return { open: active.length, knownRemaining, criticalRemaining, needsDetail, inMotion };
  }, [sorted]);

  const [timelineScriptureByRequestId, setTimelineScriptureByRequestId] = useState<
    Map<string, string[]>
  >(new Map());

  useEffect(() => {
    if (!user?.id || sorted.length === 0) {
      setTimelineScriptureByRequestId(new Map());
      return;
    }
    void listScriptureTimelineRefsByRequestIds(
      user.id,
      sorted.map((r) => r.id),
    ).then(setTimelineScriptureByRequestId);
  }, [user?.id, sorted]);

  const markAnswered = (row: PrayerRequestRow) => {
    navigate(`/prayer/requests/${row.id}/celebrate`);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PrayerShell title="Provision ledger" wide>
      <p className="mb-3 text-sm text-muted-foreground leading-relaxed">
        A specific record of what you asked for, when it is needed, what remains, how provision came,
        and the praise report after it is answered.
      </p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Open requests</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{accounting.open}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Known remaining</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatLedgerAmount(accounting.knownRemaining || null)}</p>
        </div>
        <div className="rounded-xl border border-red-200/70 bg-red-50/30 p-3 dark:bg-red-950/10">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Critical remaining</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatLedgerAmount(accounting.criticalRemaining || null)}</p>
        </div>
        <div className="rounded-xl border border-sky-200/70 bg-sky-50/30 p-3 dark:bg-sky-950/10">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Provision in motion</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{accounting.inMotion}</p>
        </div>
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/30 p-3 dark:bg-amber-950/10">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Need more detail</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{accounting.needsDetail}</p>
        </div>
      </div>

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
        <PrayerLedgerTable
          rows={sorted}
          onMarkAnswered={markAnswered}
          timelineScriptureByRequestId={timelineScriptureByRequestId}
        />
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
