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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border/60 bg-card/50 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
