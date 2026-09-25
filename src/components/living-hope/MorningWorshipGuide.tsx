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
    <section className="morning-worship-guide" aria-labelledby="worship-guide-title">
      <div className="morning-guide-heading">
        <div>
          <h2 id="worship-guide-title"><Sparkles className="h-5 w-5" aria-hidden="true" />Let worship become prayer</h2>
          <p className={cn(lh.bodySm, "mb-0")}>Do not perform this. Use it as a posture guide and stay with any moment where you sense you should remain.</p>
        </div>
        <aside className="morning-guide-reminder">Presence, not performance.<span>Stay in the moment.</span></aside>
      </div>
      <ol className="morning-phase-grid">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          return (
            <li key={phase.title} className="morning-phase-card" data-phase={phase.title.toLowerCase()}>
              <div className="morning-phase-icon"><Icon className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0">
                <div className="morning-phase-title">
                  <h3>{index + 1}. {phase.title}</h3>
                  {stepBudgetMs > 0 && <span>{formatPhaseTime(stepBudgetMs, phase.share)}</span>}
                </div>
                <p className={cn(lh.bodySm, "mb-0 leading-relaxed")}>{phase.instruction}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="morning-guide-note">
        If a lyric, thought, Scripture, gratitude, conviction, or sense of God&apos;s nearness catches your attention,
        stop there. The goal is not to finish the guide. The goal is to give God your undivided attention.
      </p>
    </section>
  );
}
