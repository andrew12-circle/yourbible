import type { JournalOverviewStats } from "@/lib/journal/journalStats";

interface Props {
  stats: JournalOverviewStats;
  accent: string;
}

export default function StatsRow({ stats, accent }: Props) {
  const items = [
    { value: stats.entryCount, label: "Entries" },
    { value: stats.mediaCount, label: "Media" },
    { value: stats.dayCount, label: "Days" },
    { value: stats.streak, label: "Streak" },
  ];

  return (
    <div className="flex flex-wrap gap-x-10 gap-y-4">
      {items.map(({ value, label }) => (
        <div key={label}>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: accent }}>
            {value}
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}
