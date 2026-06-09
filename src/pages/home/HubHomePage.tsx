import { useNavigate } from "react-router-dom";
import { Brain, NotebookPen, CheckSquare, FileStack } from "lucide-react";
import { HubPageLayout } from "@/components/shell/HubPageLayout";
import { HubStatusStrip } from "@/components/home/HubStatusStrip";
import { BibleHomeWidgets } from "@/components/home/BibleHomeWidgets";
import { LifeWeeksPanel } from "@/components/life/LifeWeeksPanel";
import { LifePrioritiesPanel } from "@/components/home/LifePrioritiesPanel";
import { HomeJournalCards } from "@/components/home/HomeJournalCards";
import { useHomeDashboard } from "@/contexts/HomeDashboardContext";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "border-border/50 transition-all cursor-pointer hover:border-primary/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <CardDescription className="text-[10px] md:text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        <div className={cn("p-1.5 md:p-2 rounded-lg", accent.replace("text-", "bg-").replace("500", "500/10"))}>
          <Icon className={cn("h-3.5 w-3.5 md:h-4 md:w-4", accent)} />
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        <div className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function HubHomePage() {
  const navigate = useNavigate();
  const { todayPrompt, onThisDayCount, counts, displayName } = useHomeDashboard();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Peace tonight";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <HubPageLayout
      title="Overview"
      description="Your weeks at a glance — then verse, journal, and more"
      mainClassName="overflow-y-auto scrollbar-hide"
    >
      <div className="space-y-3 md:space-y-6">
        <LifeWeeksPanel embedded />

        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{dateStr}</p>
          <h2 className="mt-0.5 text-lg font-semibold tracking-tight">
            {greeting}{displayName ? `, ${displayName}` : ""}
          </h2>
        </div>

        <HubStatusStrip counts={counts} />

        <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
          <StatCard
            label="Beliefs"
            value={counts.beliefs}
            icon={Brain}
            accent="text-sky-500"
            onClick={() => navigate("/framework/beliefs")}
          />
          <StatCard
            label="Journal today"
            value={counts.journalToday}
            icon={NotebookPen}
            accent="text-violet-500"
            onClick={() => navigate("/journal")}
          />
          <StatCard
            label="Artifacts"
            value={counts.artifacts}
            icon={FileStack}
            accent="text-rose-500"
            onClick={() => navigate("/framework/artifacts")}
          />
          <StatCard
            label="Tensions"
            value={counts.tensions}
            icon={CheckSquare}
            accent="text-fuchsia-500"
            onClick={() => navigate("/framework/tensions")}
          />
        </div>

        <BibleHomeWidgets />
        <LifePrioritiesPanel />
        <HomeJournalCards
          todayPrompt={todayPrompt}
          onThisDayCount={onThisDayCount}
          variant="hub"
        />
      </div>
    </HubPageLayout>
  );
}
