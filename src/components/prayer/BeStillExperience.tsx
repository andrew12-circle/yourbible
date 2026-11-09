import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Circle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuietPrayerTimer } from "@/components/prayer/QuietPrayerTimer";
import { BeStillReflection } from "@/components/prayer/BeStillReflection";
import { useBeStillSession } from "@/hooks/useBeStillSession";
import { BE_STILL_STAGES, type BeStillEntryPoint, type BeStillStage } from "@/lib/prayer/beStill";
import { MORNING_FORMULA_CONVERSATION_RETURN } from "@/lib/bible/readerNavigation";
import { cn } from "@/lib/utils";

type Props = { userId: string; entryPoint: BeStillEntryPoint; resumeId?: string };
const STAGE_ORDER: BeStillStage[] = ["stillness", "question", "picture", "listen", "reflect"];
const STAGE_COPY = {
  stillness: { title: "Be here for a moment.", body: "Settle into a quiet place. Let the day rest. You do not have to solve anything right now." },
  question: { title: "Bring one question.", body: "What would you like to bring before God? Let the many concerns become one simple question." },
  picture: { title: "Hold it gently in mind.", body: "Bring the person, situation, or choice to mind. Notice what matters without deciding the outcome." },
  listen: { title: "You can set it down now.", body: "You have brought your question. Stay present and listen without forcing an answer." },
  reflect: { title: "Make a little room to reflect.", body: "Capture what you noticed while it is fresh. There is nothing you need to prove or produce." },
} as const;

function BeStillAbout() {
  return <details className="mx-auto mt-10 max-w-xl text-sm text-muted-foreground">
    <summary className="min-h-11 cursor-pointer py-3 text-center text-xs">About this practice</summary>
    <div className="space-y-3 rounded-2xl bg-muted/40 p-5 leading-relaxed">
      <p>This practice follows four movements: stillness, one question, a clear picture, and release. Reflection comes afterward.</p>
      <p>The source video attributes the method to Nikola Tesla. That historical attribution has not been verified.</p>
      <p>A sudden or peaceful thought is something to reflect on. Its timing or feeling alone does not establish its source. Bring your impressions back to Scripture, prayer, and trusted counsel.</p>
    </div>
  </details>;
}

function StillnessMark({ complete = false }: { complete?: boolean }) {
  return <div aria-hidden className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full border border-primary/10 bg-primary/[0.025] sm:h-36 sm:w-36">
    <div className="absolute inset-3 rounded-full border border-primary/15" />
    <div className="absolute inset-6 rounded-full bg-primary/[0.05]" />
    {complete ? <Check className="relative h-8 w-8 text-primary" strokeWidth={1.5} /> : <Circle className="relative h-5 w-5 fill-primary/20 text-primary/50" strokeWidth={1} />}
  </div>;
}

export function BeStillExperience({ userId, entryPoint, resumeId }: Props) {
  const flow = useBeStillSession(userId, entryPoint, resumeId);
  const [params, setParams] = useSearchParams();
  const heading = useRef<HTMLHeadingElement>(null);
  const stage = flow.session?.stage;
  const activeSessionId = flow.session?.id;
  const activeEntryPoint = flow.session?.entryPoint;
  const origin = flow.session?.entryPoint ?? entryPoint;
  const returnTo = origin === "morning" ? MORNING_FORMULA_CONVERSATION_RETURN : "/prayer";
  const returnLabel = origin === "morning" ? "Return to Morning Formula" : "Return to Prayer";

  useEffect(() => { if (stage) heading.current?.focus({ preventScroll: true }); }, [stage, flow.completed]);
  useEffect(() => {
    if (flow.loading || !activeSessionId || !activeEntryPoint) return;
    const updateId = Boolean(resumeId && activeSessionId !== resumeId);
    const updateOrigin = (params.get("from") === "morning") !== (activeEntryPoint === "morning");
    if (!updateId && !updateOrigin) return;
    const next = new URLSearchParams(params);
    if (updateId) next.set("session", activeSessionId);
    if (activeEntryPoint === "morning") next.set("from", "morning");
    else next.delete("from");
    setParams(next, { replace: true });
  }, [flow.loading, activeSessionId, activeEntryPoint, resumeId, params, setParams]);

  if (flow.loading) return <p role="status" className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Opening your quiet space…</p>;

  const error = flow.error ? <div role="alert" className="mb-6 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm">
    <p>{flow.error}</p>
    <Button type="button" variant="outline" size="sm" onClick={() => void flow.retry()} disabled={flow.busy} className="mt-3">Try again</Button>
  </div> : null;

  if (!flow.session) return <div className="mx-auto max-w-2xl px-1 pb-6 pt-7 sm:pt-12">
    {error}
    <div className="text-center">
      <StillnessMark />
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-primary">A moment with God</p>
      <h2 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Let the day become quiet.</h2>
      <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Bring one question. Hold it gently. Let go of the effort and make room to listen.</p>
      <Button type="button" onClick={() => void flow.start()} disabled={flow.busy || Boolean(flow.error)} size="lg" className="mt-8 min-h-12 rounded-full px-8">
        {flow.busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden />}
        Begin a quiet session
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">Move at your pace. Silence is welcome.</p>
    </div>
    <ol className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {BE_STILL_STAGES.map((step, index) => <li key={step.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
        <span className="mb-3 block text-xs font-medium text-primary">0{index + 1}</span>
        <p className="text-sm font-semibold">{step.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.hint}</p>
      </li>)}
    </ol>
    <BeStillAbout />
  </div>;

  const session = flow.session;
  if (flow.completed) return <div className="mx-auto max-w-xl py-10 text-center sm:py-16">
    <StillnessMark complete />
    <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-primary">A moment kept</p>
    <h2 ref={heading} tabIndex={-1} className="font-serif text-4xl leading-tight outline-none">Your time in prayer is saved.</h2>
    <p className="mt-5 leading-relaxed text-muted-foreground">Your question and reflection are together in your journal. Return whenever you are ready to add what you understand later.</p>
    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      <Button asChild className="min-h-12 rounded-full px-6"><Link to={`/journal/${session.id}`}><BookOpen className="mr-2 h-4 w-4" aria-hidden />Open in Journal</Link></Button>
      <Button asChild variant="outline" className="min-h-12 rounded-full px-6"><Link to={returnTo}>{returnLabel}</Link></Button>
    </div>
    <Button type="button" variant="ghost" onClick={() => void flow.start()} disabled={flow.busy} className="mt-4 min-h-11">Begin another session</Button>
    {error}
  </div>;

  const stageIndex = STAGE_ORDER.indexOf(session.stage);
  const copy = STAGE_COPY[session.stage];
  const nextLabel = session.stage === "stillness" ? "Bring my question" : session.stage === "question" ? "See it clearly" : session.stage === "picture" ? "Release and listen" : "Reflect when ready";

  return <div className="mx-auto max-w-xl pb-5 pt-2 sm:pt-5">
    <nav aria-label="Listening prayer stages" className="mb-9">
      <ol className="grid grid-cols-4 gap-2">
        {BE_STILL_STAGES.map((step, index) => <li key={step.id}>
          <button type="button" disabled={flow.busy} onClick={() => flow.update({ stage: step.id })} aria-current={session.stage === step.id ? "step" : undefined}
            className={cn("flex min-h-14 w-full flex-col items-center gap-2 rounded-xl px-1 py-2 text-center text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs", session.stage === step.id ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted/50")}>
            <span aria-hidden className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[10px]", index < stageIndex ? "border-primary/30 bg-primary/10 text-primary" : "border-border")}>{index < stageIndex ? <Check className="h-3 w-3" /> : index + 1}</span>
            {step.label}
          </button>
        </li>)}
      </ol>
    </nav>
    {error}
    <div className="mb-7 text-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-primary">{session.stage === "reflect" ? "After the quiet" : `Step ${stageIndex + 1} of 4`}</p>
      <h2 ref={heading} tabIndex={-1} className="font-serif text-3xl leading-tight outline-none sm:text-4xl">{copy.title}</h2>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.body}</p>
    </div>
    {session.stage === "stillness" ? <div>
      <p className="mb-6 text-center font-serif text-lg italic leading-relaxed text-foreground/80">Father, I am here. Help me become attentive to You.</p>
      <QuietPrayerTimer key="stillness" initialMinutes={2} title="A little stillness" />
    </div> : null}
    {session.stage === "question" ? <div className="space-y-3">
      <Label htmlFor="be-still-question" className="text-base">My question</Label>
      <Textarea id="be-still-question" value={session.question} onChange={(event) => flow.update({ question: event.target.value })}
        placeholder="Father, what is the next faithful step I can take?" rows={3} maxLength={500} disabled={flow.busy}
        aria-describedby="be-still-question-help" className="rounded-2xl p-5 text-base leading-relaxed" />
      <p id="be-still-question-help" className="text-sm leading-relaxed text-muted-foreground">One clear sentence is enough. You can also continue with an unspoken question.</p>
    </div> : null}
    {session.stage === "picture" ? <div className="space-y-5">
      {session.question ? <blockquote className="rounded-2xl bg-primary/5 p-5 font-serif text-xl leading-relaxed">{session.question}</blockquote> : null}
      <p className="text-sm leading-relaxed text-muted-foreground">If it is about a person, bring them to mind. If it is a choice, consider the paths. Words or a simple awareness work too.</p>
      <div className="space-y-3"><Label htmlFor="be-still-picture">What I am bringing into prayer <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea id="be-still-picture" value={session.picture} onChange={(event) => flow.update({ picture: event.target.value })} placeholder="A person, a situation, or a choice…"
          rows={4} maxLength={6000} disabled={flow.busy} className="rounded-2xl p-4 text-base" />
      </div>
    </div> : null}
    {session.stage === "listen" ? <div className="space-y-5">
      {session.question ? <details className="text-center"><summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">Show my question</summary><p className="mx-auto max-w-md pb-3 font-serif text-lg">{session.question}</p></details> : null}
      <QuietPrayerTimer key="listen" initialMinutes={5} title="Release and listen" onReflect={() => flow.update({ stage: "reflect" })} />
      <p className="text-center text-sm text-muted-foreground">There is nothing you need to produce.</p>
    </div> : null}
    {session.stage === "reflect" ? <BeStillReflection session={session} onChange={flow.update} disabled={flow.busy} /> : null}
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="ghost" disabled={flow.busy || stageIndex === 0} onClick={() => flow.update({ stage: STAGE_ORDER[stageIndex - 1] })} className="min-h-12 rounded-full"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden />Back</Button>
      {session.stage === "reflect" ? <Button type="button" disabled={flow.busy} onClick={() => void flow.complete()} className="min-h-12 rounded-full px-7">
        {flow.busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Check className="mr-2 h-4 w-4" aria-hidden />}Save my reflection
      </Button> : <Button type="button" disabled={flow.busy} onClick={() => flow.update({ stage: STAGE_ORDER[stageIndex + 1] })} className="min-h-12 rounded-full px-7">{nextLabel}<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>}
    </div>
    <div className="mt-5 flex flex-col items-center gap-3 text-xs text-muted-foreground">
      <p role="status">{flow.draftStatus === "saving" ? "Keeping your draft…" : flow.draftStatus === "error" ? "Your draft needs attention." : "Draft kept on this device. Save when you finish."}</p>
      <Link to={returnTo} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{returnLabel}</Link>
    </div>
  </div>;
}
