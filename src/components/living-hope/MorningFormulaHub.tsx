import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Anchor, BookOpen, Calendar, Check, ChevronRight, Eye, Footprints, Heart, Mail, Music2, Sparkles, Sunrise, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { LivingHopeGoalRow, LivingHopeLetterRow, LivingHopeReviewRow } from "@/lib/livingHope/api";
import { findMorningReviewJournalEntry } from "@/lib/livingHope/morningReviewJournal";
import { getMorningFormulaEntryTarget } from "@/lib/livingHope/morningFormulaEntry";
import { loadMorningRitualDraft, resolveDraftStepIndex, summarizeMorningRitualDraft } from "@/lib/livingHope/morningRitualDraft";
import { buildRitualSteps } from "@/lib/livingHope/morningRitual";
import { morningJourneyProgress } from "@/lib/livingHope/morningPresentation";
import { localDateISO } from "@/lib/lifePriorities";
import { formatUnlockLabel, isLetterUnlockable } from "@/lib/livingHope/letterSections";
import { getPhaseProgress, getTodayPreview, getWorkbookReadiness, isSectionComplete } from "@/lib/livingHope/workbookProgress";
import { WORKBOOK_PHASES, WORKBOOK_SECTIONS, type LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import { IosGroupedRow, IosGroupedSection } from "./IosGroupedSection";
import { MorningPageHero } from "./MorningPageHero";

type Props = {
  workbook: LivingHopeWorkbookContent | null;
  letter: LivingHopeLetterRow | null;
  goals: LivingHopeGoalRow[];
  todayReview: LivingHopeReviewRow | null;
  streak: number;
  greeting: string;
};
const phaseIcons = { anchor: Anchor, see: Eye, move: Footprints };
const rhythm = [
  { title: "Worship", detail: "Set your heart", icon: Music2, tone: "gold" },
  { title: "Gratitude", detail: "Notice His goodness", icon: Heart, tone: "rose" },
  { title: "Scripture", detail: "Listen to the Word", icon: BookOpen, tone: "blue" },
  { title: "Prayer", detail: "Bring it to Him", icon: Sparkles, tone: "green" },
  { title: "Today's focus", detail: "Live with purpose", icon: Target, tone: "violet" },
];
const resources = [
  { href: "/living-hope/workbook/stories", title: "Your scenes", detail: "Return to the life you are practicing.", icon: Eye },
  { href: "/living-hope/workbook/manifesto", title: "Identity & truth", detail: "Remember who you are becoming.", icon: BookOpen },
  { href: "/living-hope/workbook/routine", title: "Worship & routine", detail: "Prepare the rhythm of your morning.", icon: Music2 },
  { href: "/living-hope/workbook/weekly", title: "Weekly reflection", detail: "Notice progress and choose a next step.", icon: Calendar },
];

export function MorningFormulaHub({ workbook, letter, goals, todayReview, streak, greeting }: Props) {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [lookupError, setLookupError] = useState(false);
  const [journalLookup, setJournalLookup] = useState<{ owner: string; date: string; id: string } | null>(null);
  const today = localDateISO();
  const reviewedToday = Boolean(todayReview && todayReview.review_date === today);
  const journalEntryId = journalLookup?.owner === user?.id && journalLookup?.date === today ? journalLookup.id : null;
  const { percent, ritualReady, nextStep } = getWorkbookReadiness(workbook, goals, letter);
  const preview = workbook ? getTodayPreview(workbook) : null;
  const draft = useMemo(() => user?.id ? loadMorningRitualDraft(user.id) : null, [user?.id, refresh, today]);
  const summary = summarizeMorningRitualDraft(draft);
  const resuming = Boolean(summary?.inProgress);
  const entry = getMorningFormulaEntryTarget({ ritualReady, reviewedToday, draft: summary });
  const steps = buildRitualSteps(workbook, goals.filter((goal) => goal.status === "active"), resuming && Boolean(draft?.expressMode));
  const progress = morningJourneyProgress(steps, resuming && draft ? resolveDraftStepIndex(draft, steps) : 0, reviewedToday && !resuming);
  const href = resuming ? entry.href : reviewedToday && journalEntryId ? `/journal/${journalEntryId}` : "/living-hope/review";
  const label = resuming ? `Resume at ${summary?.stepLabel}` : reviewedToday ? "Open today's journal" : "Begin my morning";
  const letterStatus = letter?.status ?? "draft";
  const canOpen = letter?.unlock_at && isLetterUnlockable(letter.unlock_at);
  const letterDetail = letterStatus === "draft" ? "Write your letter" : letterStatus === "sealed" && !canOpen
    ? `Sealed until ${formatUnlockLabel(letter?.unlock_at ?? null)}` : letterStatus === "sealed" ? "Ready to open" : "Opened — return to your letter";
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    const update = () => { if (document.visibilityState !== "hidden") setRefresh((value) => value + 1); };
    window.addEventListener("focus", update);
    window.addEventListener("storage", update);
    document.addEventListener("visibilitychange", update);
    const interval = window.setInterval(update, 60_000);
    return () => {
      window.removeEventListener("focus", update); window.removeEventListener("storage", update);
      document.removeEventListener("visibilitychange", update); window.clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setJournalLookup(null); setLookupError(false);
    if (user?.id && reviewedToday) {
      void findMorningReviewJournalEntry(user.id, today).then((id) => {
        if (active) { setJournalLookup(id ? { owner: user.id, date: today, id } : null); setLookupError(!id); }
      }).catch(() => { if (active) setLookupError(true); });
    }
    return () => { active = false; };
  }, [user?.id, reviewedToday, today, lookupAttempt]);

  const phases = WORKBOOK_PHASES.map((phase) => ({ ...phase, progress: workbook ? getPhaseProgress(phase.key, workbook, letter)
    : { filled: 0, total: WORKBOOK_SECTIONS.filter((section) => section.phase === phase.key).length + (phase.key === "anchor" ? 1 : 0) } }));

  return <div className="morning-hub">
    <MorningPageHero title="Morning formula" eyebrow={dateStr} subtitle={`${greeting}. Take a moment. Begin with God.`} reminder="A new day. A higher calling.">
      {reviewedToday && !resuming && !journalEntryId ? <>
        <Button className="morning-primary-action" disabled={!lookupError} onClick={() => setLookupAttempt((value) => value + 1)}>
          {lookupError ? "Try opening today's journal again" : "Opening today's journal…"}
        </Button>
        {lookupError && <p role="alert" className="morning-hero-error">Your completed journal could not be found. No new entry has been created.</p>}
      </> : <Button asChild className="morning-primary-action"><Link to={href}>{label}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></Button>}
    </MorningPageHero>
    <div className="morning-session-width morning-hub-content">
      <section className="morning-overview-card morning-surface" aria-label="Today's morning">
        <div className="morning-cover" aria-hidden="true"><Sunrise /><span>Morning<strong>formula</strong></span></div>
        <div className="morning-overview-body">
          <div className="morning-section-heading"><div><p className="morning-eyebrow">Your daily rhythm</p><h2>Your morning with God</h2>
            <p>{resuming ? "Your morning is still here. Pick up where you left off." : reviewedToday ? "Your reflections and priorities are together in today's journal." : "Worship, read, reflect, pray, and choose one faithful next step."}</p>
          </div><span className="morning-status-chip">{resuming ? "In progress" : reviewedToday ? "Complete" : "Ready when you are"}</span></div>
          <div className="morning-progress-line"><div className="morning-progress-track" role="progressbar" aria-label="Today's session progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}
            aria-valuetext={`${progress.completed} of ${progress.total} activities completed`}><span style={{ width: `${progress.percent}%` }} /></div><span>{progress.percent}% complete</span></div>
          <p className="morning-session-caption">{resuming ? `Step ${progress.position} of ${progress.total} · ${summary?.stepLabel}` : reviewedToday ? `${progress.total} activities completed` : `${progress.total} guided activities · at your own pace`}
            {streak > 0 && <span> · {streak} {streak === 1 ? "morning" : "mornings"} in a row</span>}</p>
          <div className="morning-rhythm" aria-label="Morning rhythm">{rhythm.map(({ title, detail, icon: Icon, tone }) => <div key={title} className="morning-rhythm-item"><span className="morning-icon-bubble" data-tone={tone}><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{detail}</p></div></div>)}</div>
        </div>
      </section>

      <section className="morning-foundation-card morning-surface" aria-labelledby="morning-foundation-heading">
        <div className="morning-section-heading"><div><h2 id="morning-foundation-heading">My foundation</h2><p>Build once. Return when you need to realign. This is setup readiness, not today's session progress.</p></div><span className="morning-status-chip">{percent}% ready</span></div>
        <div className="morning-foundation-phases">{phases.map((phase) => {
          const Icon = phaseIcons[phase.key];
          const destination = phase.key === "anchor" ? "/living-hope/letter" : `/living-hope/workbook/${phase.key === "see" ? "vision" : "routine"}`;
          return <Link key={phase.key} to={destination} className="morning-foundation-phase"><span className="morning-icon-bubble"><Icon aria-hidden="true" /></span><div><h3>{phase.label}</h3><p>{phase.description}</p><small>{phase.progress.filled} of {phase.progress.total} sections ready</small></div><ChevronRight className="morning-link-chevron" aria-hidden="true" /></Link>;
        })}</div>
        <details className="morning-foundation-details"><summary>Explore all foundation sections <ChevronRight aria-hidden="true" /></summary>
          <div className="morning-foundation-section-grid">{phases.map((phase) => <IosGroupedSection key={phase.key} title={`${phase.label} · ${phase.progress.filled}/${phase.progress.total}`} footer={`${phase.scripture} — ${phase.description}`} className="mb-0">
            {phase.key === "anchor" && <IosGroupedRow to="/living-hope/letter" icon={Mail} label="Letter from the future" detail={letterDetail} done={letterStatus !== "draft"} />}
            {WORKBOOK_SECTIONS.filter((section) => section.phase === phase.key).map((section) => <IosGroupedRow key={section.key} to={`/living-hope/workbook/${section.key}`} label={section.label} detail={section.hint} done={workbook ? isSectionComplete(workbook, section.key) : false} />)}
          </IosGroupedSection>)}</div>
        </details>
        <div className="morning-foundation-next">{nextStep && <Link to={nextStep.href}><Sparkles aria-hidden="true" /><span>Next: {nextStep.label}</span><ChevronRight aria-hidden="true" /></Link>}
          <Link to="/living-hope/letter"><Target aria-hidden="true" /><span>{goals.filter((goal) => goal.status === "active").length} active goals</span><ChevronRight aria-hidden="true" /></Link></div>
      </section>

      <section className="morning-resources morning-surface" aria-labelledby="morning-resources-heading">
        <div className="morning-section-heading"><div><h2 id="morning-resources-heading">Reflections & supporting tools</h2><p>Prepare your morning or go a little deeper.</p></div></div>
        <div className="morning-resource-grid">{resources.map(({ href: destination, title, detail, icon: Icon }) => <Link key={destination} className="morning-resource-card" to={destination}><span className="morning-resource-art" aria-hidden="true"><Icon /></span><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight className="morning-link-chevron" aria-hidden="true" /></Link>)}</div>
        {new Date().getDay() === 0 && <p className="morning-sunday-note"><Calendar aria-hidden="true" />Sunday is a good time to look back over your week.</p>}
      </section>

      {(reviewedToday || (ritualReady && (preview?.manifesto?.text || preview?.story?.text || workbook?.vision_headline))) && <section className="morning-personal-notes morning-surface" aria-label="Personal reflections">
        {reviewedToday && todayReview?.surrender_note && <div><h2>Today's surrender</h2><p className="morning-personal-quote">{todayReview.surrender_note}</p></div>}
        {ritualReady && preview?.manifesto?.text && <Link to="/living-hope/workbook/manifesto"><BookOpen aria-hidden="true" /><span><strong>Today's identity reminder</strong><small>{preview.manifesto.text}</small></span></Link>}
        {ritualReady && workbook?.vision_headline && <Link to="/living-hope/workbook/vision"><Eye aria-hidden="true" /><span><strong>Your vision</strong><small>{workbook.vision_headline}{workbook.income_total_label ? ` · ${workbook.income_total_label}` : ""}</small></span></Link>}
        {ritualReady && preview?.story?.text && <Link to="/living-hope/workbook/stories"><Sparkles aria-hidden="true" /><span><strong>Today's scene</strong><small>{preview.story.text}</small></span></Link>}
        {reviewedToday && <div className="morning-foundation-next">{journalEntryId && <Link to={`/journal/${journalEntryId}`}><Check aria-hidden="true" />Journal entry<ChevronRight aria-hidden="true" /></Link>}<Link to="/framework/graph"><Target aria-hidden="true" />Mind map<ChevronRight aria-hidden="true" /></Link></div>}
      </section>}
    </div>
  </div>;
}
