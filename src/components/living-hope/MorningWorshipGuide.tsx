import { Eye, Hand, Heart, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { lh } from "@/lib/livingHope/themeClasses";

type Props = { stepBudgetMs: number };

const phases = [
  {
    icon: Eye,
    title: "Arrive",
    share: 0.15,
    instruction:
      "Set the phone down. Relax your shoulders. Close your eyes if that helps you focus. Take a few slow breaths and become aware that God is here.",
  },
  {
    icon: Hand,
    title: "Open",
    share: 0.25,
    instruction:
      "Turn your palms upward or open your hands. Release the pressure you carried into the morning. You do not have to solve anything right now. Give God your attention.",
  },
  {
    icon: Heart,
    title: "Adore",
    share: 0.4,
    instruction:
      "Listen to the words and make them your own. Think about who God is before thinking about what you need. Thank Him for His goodness, faithfulness, mercy, holiness, and what He has already done.",
  },
  {
    icon: MessageCircle,
    title: "Respond",
    share: 0.2,
    instruction:
      "Speak to God naturally. Sing if you want to sing. Be quiet if you need silence. Tell Him what is true in your heart, then stay still for a moment instead of rushing to the next thing.",
  },
] as const;

function formatPhaseTime(totalMs: number, share: number) {
  const seconds = Math.max(30, Math.round((totalMs * share) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!minutes) return `~${remainder} sec`;
  if (!remainder) return `~${minutes} min`;
  return `~${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function MorningWorshipGuide({ stepBudgetMs }: Props) {
  return (
    <section className="space-y-4" aria-labelledby="worship-guide-title">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="worship-guide-title" className="text-[15px] font-semibold text-foreground">
            Let worship become prayer
          </h2>
        </div>
        <p className={cn(lh.bodySm, "mb-0")}>
          Do not perform this. Use it as a posture guide and stay with any moment where you sense you should remain.
        </p>
      </div>

      <ol className="space-y-4">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          return (
            <li key={phase.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <Icon className="h-4 w-4 text-foreground/75" aria-hidden />
              </div>
              <div className="min-w-0 border-b border-border/50 pb-4 last:border-b-0">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-medium text-foreground">
                    {index + 1}. {phase.title}
                  </p>
                  {stepBudgetMs > 0 ? (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatPhaseTime(stepBudgetMs, phase.share)}
                    </span>
                  ) : null}
                </div>
                <p className={cn(lh.bodySm, "mb-0 leading-relaxed")}>{phase.instruction}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-[13px] italic leading-relaxed text-muted-foreground">
        If a lyric, thought, Scripture, gratitude, conviction, or sense of God&apos;s nearness catches your attention,
        stop there. The goal is not to finish the guide. The goal is to give God your undivided attention.
      </p>
    </section>
  );
}
