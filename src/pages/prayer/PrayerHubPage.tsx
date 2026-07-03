import { Link, Navigate } from "react-router-dom";
import { HandHeart, NotebookPen, Plus, LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerStatsPanel from "@/components/prayer/PrayerStatsPanel";
import PrayerRequestCard from "@/components/prayer/PrayerRequestCard";
import { Button } from "@/components/ui/button";
import { usePrayerRequests } from "@/hooks/usePrayerRequests";
import { usePrayerStats } from "@/hooks/usePrayerStats";

export default function PrayerHubPage() {
  const { user, loading } = useAuth();
  const { rows, loading: listLoading } = usePrayerRequests(user?.id, { status: "all" });
  const stats = usePrayerStats(rows);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const waiting = rows.filter((r) => r.status === "waiting").slice(0, 5);
  const recentAnswered = rows
    .filter((r) => r.status === "answered" || r.status === "different_answer")
    .slice(0, 3);

  return (
    <PrayerShell title="Prayer">
      <p className="mb-5 text-[15px] text-muted-foreground leading-relaxed">
        Write what you need — item, amount, deadline — and record how God provides. Your journal holds
        conversation with God; this ledger builds evidence of answered prayer over years.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/prayer/requests/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add need
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/prayer/requests">
            <LayoutGrid className="mr-1.5 h-4 w-4" />
            Open ledger
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/journal">
            <NotebookPen className="mr-1.5 h-4 w-4" />
            Prayer journal
          </Link>
        </Button>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Faithfulness over time
        </h2>
        <PrayerStatsPanel stats={stats} />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Waiting on God
          </h2>
          <Link to="/prayer/requests?status=waiting" className="text-xs font-medium text-primary">
            View all
          </Link>
        </div>
        {listLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : waiting.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <HandHeart className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No open requests. Add what you are asking God for.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {waiting.map((r) => (
              <PrayerRequestCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </section>

      {recentAnswered.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recently answered
            </h2>
            <Link to="/prayer/praise" className="text-xs font-medium text-primary">
              Praise reports
            </Link>
          </div>
          <div className="space-y-2">
            {recentAnswered.map((r) => (
              <PrayerRequestCard key={r.id} request={r} />
            ))}
          </div>
        </section>
      ) : null}
    </PrayerShell>
  );
}
