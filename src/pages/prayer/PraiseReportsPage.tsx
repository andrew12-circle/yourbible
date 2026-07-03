import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerStatsPanel from "@/components/prayer/PrayerStatsPanel";
import PraiseReportCard from "@/components/prayer/PraiseReportCard";
import { cn } from "@/lib/utils";
import { listPrayerRequests, fetchRequestsByPraiseEntryIds } from "@/lib/prayer/api";
import { usePrayerStats } from "@/hooks/usePrayerStats";
import type { PrayerRequestRow } from "@/lib/prayer/types";
import type { PraiseReportPeriod } from "@/lib/prayer/types";

type PraiseRow = {
  id: string;
  title: string | null;
  body: string | null;
  entry_at_ts: string;
};

const PERIODS: { id: PraiseReportPeriod; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
  { id: "lifetime", label: "Lifetime" },
];

function inPeriod(iso: string, period: PraiseReportPeriod, now = new Date()): boolean {
  if (period === "lifetime") return true;
  const d = new Date(iso);
  if (period === "year") return d.getFullYear() === now.getFullYear();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function PraiseReportsPage() {
  const { user, loading } = useAuth();
  const [entries, setEntries] = useState<PraiseRow[]>([]);
  const [requests, setRequests] = useState<PrayerRequestRow[]>([]);
  const [linkMap, setLinkMap] = useState<Map<string, PrayerRequestRow>>(new Map());
  const [fetching, setFetching] = useState(true);
  const [period, setPeriod] = useState<PraiseReportPeriod>("lifetime");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setFetching(true);
      const [e, r] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id,title,body,entry_at_ts")
          .eq("user_id", user.id)
          .eq("entry_kind", "praise_report")
          .order("entry_at_ts", { ascending: false })
          .limit(500),
        listPrayerRequests(user.id, { status: "all" }),
      ]);
      const praiseRows = (e.data as PraiseRow[]) ?? [];
      setEntries(praiseRows);
      setRequests(r);
      const map = await fetchRequestsByPraiseEntryIds(
        user.id,
        praiseRows.map((p) => p.id),
      );
      setLinkMap(map);
      setFetching(false);
    })();
  }, [user]);

  const stats = usePrayerStats(requests);

  const visible = useMemo(
    () => entries.filter((entry) => inPeriod(entry.entry_at_ts, period)),
    [entries, period],
  );

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PrayerShell title="Praise reports" wide>
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground leading-relaxed">
        Instead of reading worries, read God&apos;s faithfulness. These memorials celebrate what He has done.
      </p>

      <section className="mb-6">
        <PrayerStatsPanel stats={stats} compact />
      </section>

      <div className="mb-5 flex flex-wrap gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              period === p.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {fetching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">No praise reports in this period</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When a prayer is answered, a praise report is created automatically — or write one in Journal.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((entry) => (
            <PraiseReportCard
              key={entry.id}
              entry={entry}
              linkedRequest={linkMap.get(entry.id) ?? null}
            />
          ))}
        </div>
      )}
    </PrayerShell>
  );
}
