import { HubPageLayout } from "@/components/shell/HubPageLayout";
import { HubStatusStrip } from "@/components/home/HubStatusStrip";
import { BibleHomeWidgets } from "@/components/home/BibleHomeWidgets";
import { LifeWeeksPanel } from "@/components/life/LifeWeeksPanel";
import { LifePrioritiesPanel } from "@/components/home/LifePrioritiesPanel";
import { HomeJournalCards } from "@/components/home/HomeJournalCards";
import { MorningFormulaHomeCard } from "@/components/home/MorningFormulaHomeCard";
import { useHomeDashboard } from "@/contexts/HomeDashboardContext";

export default function HubHomePage() {
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
        <LifeWeeksPanel
          embedded
          leadingContent={
            <>
              <div className="rounded-xl border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{dateStr}</p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight">
                  {greeting}{displayName ? `, ${displayName}` : ""}
                </h2>
              </div>
              <HubStatusStrip counts={counts} />
            </>
          }
        />

        <MorningFormulaHomeCard />
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
