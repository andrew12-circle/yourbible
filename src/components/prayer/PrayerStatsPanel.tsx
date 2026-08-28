import type { PrayerStats } from "@/lib/prayer/stats";

export default function PrayerStatsPanel({ stats, compact = false }: { stats: PrayerStats; compact?: boolean }) {
  const items = [
    { label: "Total requests", value: stats.total },
    { label: "Answered", value: stats.answered },
    { label: "Waiting", value: stats.waiting },
    { label: "Different answer", value: stats.differentAnswer },
    { label: "Avg wait", value: stats.averageWaitDays != null ? `${stats.averageWaitDays} days` : "—" },
    { label: "Longest wait", value: stats.longestWaitHuman ?? "—" },
  ];

  if (compact) {
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        {stats.total} requests · {stats.answered} answered · {stats.waiting} waiting
        {stats.averageWaitDays != null ? ` · avg ${stats.averageWaitDays} days` : ""}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        {items.slice(0, 3).map((item) => (
          <StatCard key={item.label} item={item} mobile />
        ))}
        <div className="col-span-3 grid grid-cols-3 gap-2">
          {items.slice(3).map((item) => (
            <StatCard key={item.label} item={item} mobile />
          ))}
        </div>
      </div>
      <div className="hidden gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </div>
    </>
  );
}

function StatCard({
  item,
  mobile = false,
}: {
  item: { label: string; value: string | number };
  mobile?: boolean;
}) {
  return (
    <div
      className={mobile
        ? "rounded-lg border border-border/60 bg-card/50 px-2 py-2"
        : "rounded-xl border border-border/60 bg-card/50 px-3 py-2.5"}
    >
      <p
        className={mobile
          ? "text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground"
          : "text-[11px] font-medium uppercase tracking-wider text-muted-foreground"}
      >
        {item.label}
      </p>
      <p
        className={mobile
          ? "mt-0.5 text-base font-semibold tabular-nums"
          : "mt-0.5 text-lg font-semibold tabular-nums"}
      >
        {item.value}
      </p>
    </div>
  );
}
