import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerRequestCard from "@/components/prayer/PrayerRequestCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrayerRequests } from "@/hooks/usePrayerRequests";
import { PRAYER_STATUSES, PRAYER_STATUS_LABELS } from "@/lib/prayer/statuses";
import { PRAYER_CATEGORIES, PRAYER_CATEGORY_LABELS } from "@/lib/prayer/categories";
import type { PrayerCategory, PrayerRequestStatus } from "@/lib/prayer/types";

const STATUS_FILTERS: { id: PrayerRequestStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  ...PRAYER_STATUSES.map((s) => ({ id: s, label: PRAYER_STATUS_LABELS[s] })),
];

export default function PrayerRequestsListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialStatus = (params.get("status") as PrayerRequestStatus | null) ?? "all";
  const [statusFilter, setStatusFilter] = useState<PrayerRequestStatus | "all">(
    STATUS_FILTERS.some((f) => f.id === initialStatus) ? initialStatus : "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<PrayerCategory | "all">("all");

  const { rows, loading: listLoading } = usePrayerRequests(user?.id, {
    status: statusFilter,
    category: categoryFilter,
  });

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.requested_at.localeCompare(a.requested_at)),
    [rows],
  );

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PrayerShell title="Prayer requests">
      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
        George Müller wrote each need down before asking anyone but God — then marked it answered when provision
        came. Each card is one petition.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to="/prayer/requests/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New request
          </Link>
        </Button>
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
          <p className="font-medium">No requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Write down what you are asking God for.</p>
          <Button className="mt-4" onClick={() => navigate("/prayer/requests/new")}>
            Add first request
          </Button>
        </div>
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
