import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { BookOpen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalVideoTransferStatus } from "@/components/journal/JournalVideoTransferStatus";
import { useJournalEntryVideos } from "@/hooks/useJournalEntryVideos";
import JournalEntryVideos from "@/components/journal/JournalEntryVideos";
import { dailyAssignmentDisplayLabel, DAILY_ASSIGNMENT_FIELDS, type DailyAssignment } from "@/lib/livingHope/morningRitual";
import { isLocalModeNotified } from "@/lib/livingHope/livingHopeLocalStore";
import { lh } from "@/lib/livingHope/themeClasses";

type Props = { userId?: string; entryId: string | null; reference?: string; reflection: string; assignment: DailyAssignment };
export function MorningSessionComplete({ userId, entryId, reference, reflection, assignment }: Props) {
  const reducedMotion = useReducedMotion();
  const media = useJournalEntryVideos(entryId);
  const priorities = DAILY_ASSIGNMENT_FIELDS.filter((field) => assignment[field.key].trim());
  return <section className="relative space-y-7 overflow-hidden pb-5">
    {!reducedMotion ? (
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
        <style>{`
          @keyframes morning-confetti-fall {
            0% { transform: translate3d(0,-12vh,0) rotate(0deg); opacity: 1; }
            100% { transform: translate3d(var(--drift),110vh,0) rotate(720deg); opacity: .15; }
          }
        `}</style>
        {Array.from({ length: 34 }, (_, index) => {
          const left = (index * 29) % 100;
          const delay = (index % 9) * 0.09;
          const duration = 2.4 + (index % 7) * 0.18;
          const drift = `${((index % 5) - 2) * 24}px`;
          const shapes = ["rounded-full", "rounded-sm", "rounded-full"];
          const tones = [
            "bg-amber-400",
            "bg-sky-400",
            "bg-emerald-400",
            "bg-rose-400",
            "bg-violet-400",
          ];
          return (
            <span
              key={index}
              className={`absolute -top-5 h-3 w-2 ${shapes[index % shapes.length]} ${tones[index % tones.length]}`}
              style={{
                left: `${left}%`,
                animation: `morning-confetti-fall ${duration}s ease-in ${delay}s both`,
                ["--drift" as string]: drift,
              }}
            />
          );
        })}
      </div>
    ) : null}
    <header><Check className="mb-4 h-7 w-7 text-muted-foreground" aria-hidden /><h1 data-morning-heading tabIndex={-1} className="font-serif text-3xl outline-none sm:text-4xl">Your morning is complete.</h1>
      <p className="mt-3 text-base text-muted-foreground">{isLocalModeNotified() ? "Your reflections are kept on this device. Check the journal for sync status." : "Your reflections and priorities are together in today's journal."}</p></header>
    {reference && <div><h2 className="mb-2 text-sm font-medium text-muted-foreground">Today's Scripture</h2><p className="text-xl font-semibold">{reference}</p></div>}
    {reflection.trim() && <div><h2 className="mb-2 text-sm font-medium text-muted-foreground">What you're carrying forward</h2><p className="whitespace-pre-wrap font-serif text-xl leading-relaxed">{reflection}</p></div>}
    {priorities.length > 0 && <div><h2 className="mb-3 text-sm font-medium text-muted-foreground">Today's priorities</h2><dl className="divide-y divide-border/50">{priorities.map(({ key }) => <div key={key} className="py-3"><dt className="text-sm text-muted-foreground">{dailyAssignmentDisplayLabel(key)}</dt><dd className="mt-1 whitespace-pre-wrap text-base">{assignment[key]}</dd></div>)}</dl></div>}
    <JournalVideoTransferStatus userId={userId} entryId={entryId} />
    <JournalEntryVideos videos={media.videos} />
    {media.error && <p className="text-sm text-muted-foreground">Recordings could not be refreshed here. Open the journal to check them.</p>}
    {entryId && <Button asChild className={lh.btnPrimary}><Link to={`/journal/${entryId}`}><BookOpen className="mr-2 h-4 w-4" aria-hidden />Open today's journal</Link></Button>}
  </section>;
}
