import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Circle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuietPrayerTimer } from "@/components/prayer/QuietPrayerTimer";
import { BeStillReflection } from "@/components/prayer/BeStillReflection";
import { BeStillPreparation } from "@/components/prayer/BeStillPreparation";
import { BeStillVisualization } from "@/components/prayer/BeStillVisualization";
import { useBeStillSession } from "@/hooks/useBeStillSession";
import { BE_STILL_STAGES, readyForStillness, type BeStillEntryPoint, type BeStillStage } from "@/lib/prayer/beStill";
import { MORNING_FORMULA_CONVERSATION_RETURN } from "@/lib/bible/readerNavigation";
import { cn } from "@/lib/utils";

type Props = { userId: string; entryPoint: BeStillEntryPoint; resumeId?: string };
const STAGE_ORDER: BeStillStage[] = ["prepare", "stillness", "question", "picture", "listen", "reflect"];
const STAGE_COPY = {
  prepare: { title: "Prepare to receive.", body: "Before sitting, make your one question clear and prepare the same place and hour." },
  stillness: { title: "Become still.", body: "Put the day away. Sit quietly with nothing in your hands and nothing waiting to interrupt." },
  question: { title: "One question.", body: "Hold the single sentence you wrote before sitting. Do not add another question." },
  picture: { title: "See the question.", body: "Make the person, the two roads, or the situation a clear picture in your mind." },
  listen: { title: "Release it.", body: "Stop asking. Do not argue with the question or try to guess the answer. Wait without forcing." },
  reflect: { title: "Record what came.", body: "The ledger distinguishes thoughts built by reasoning from those that seemed to arrive whole, then lets you review what proved true." },
} as const;

function BeStillAbout() {
  return <details className="mx-auto mt-10 max-w-xl text-sm text-muted-foreground">
    <summary className="min-h-11 cursor-pointer py-3 text-center text-xs">About this practice</summary>
    <div className="space-y-3 rounded-2xl bg-muted/40 p-5 leading-relaxed">
      <p>The account instructs: be still, ask one question, see it clearly, then let it go. Prepare the written question before sitting. Observe any thought that arrives whole, and later compare it with ordinary reasoning in the ledger.</p>
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
      <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">Write one question before sitting. Be still, see it clearly, then release it and wait without forcing.</p>
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
      <Button asChild variant="outline" className="min-h-12 rounded-full px-6"><Link to="/prayer/be-still/ledger">Open receiving ledger</Link></Button>
      <Button asChild variant="outline" className="min-h-12 rounded-full px-6"><Link to={returnTo}>{returnLabel}</Link></Button>
    </div>
    <Button type="button" variant="ghost" onClick={() => void flow.start()} disabled={flow.busy} className="mt-4 min-h-11">Begin another session</Button>
    {error}
  </div>;

  const stageIndex = STAGE_ORDER.indexOf(session.stage);
  const copy = STAGE_COPY[session.stage];
  const nextLabel = session.stage === "prepare" ? "Begin stillness" : session.stage === "stillness" ? "Bring my question" : session.stage === "question" ? "See it clearly" : session.stage === "picture" ? "Release and listen" : "Reflect when ready";

  return <div className="mx-auto max-w-xl pb-5 pt-2 sm:pt-5">
    {session.stage !== "prepare" && session.stage !== "listen" ? <nav aria-label="Listening prayer stages" className="mb-9">
      <ol className="grid grid-cols-4 gap-2">
        {BE_STILL_STAGES.map((step, index) => <li key={step.id}>
          <button type="button" disabled={flow.busy || index >= stageIndex} onClick={() => flow.update({ stage: step.id })} aria-current={session.stage === step.id ? "step" : undefined}
            className={cn("flex min-h-14 w-full flex-col items-center gap-2 rounded-xl px-1 py-2 text-center text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs", session.stage === step.id ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted/50")}>
            <span aria-hidden className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[10px]", index < stageIndex - 1 ? "border-primary/30 bg-primary/10 text-primary" : "border-border")}>{index < stageIndex - 1 ? <Check className="h-3 w-3" /> : index + 1}</span>
            {step.label}
          </button>
        </li>)}
      </ol>
    </nav> : null}
    {error}
    <div className="mb-7 text-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-primary">{session.stage === "prepare" ? "Before sitting" : session.stage === "reflect" ? "After the quiet" : `Step ${stageIndex} of 4`}</p>
      <h2 ref={heading} tabIndex={-1} className="font-serif text-3xl leading-tight outline-none sm:text-4xl">{copy.title}</h2>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.body}</p>
    </div>
    {session.stage === "prepare" ? <BeStillPreparation session={session} onChange={flow.update} disabled={flow.busy} /> : null}
    {session.stage === "stillness" ? <QuietPrayerTimer key="stillness" initialMinutes={2} title="Put the day away" /> : null}
    {session.stage === "question" ? <section className="space-y-4">
      <p className="text-sm text-muted-foreground">The transcript instructs you to write the sentence before sitting. Here is the one you prepared:</p>
      <blockquote className="rounded-2xl bg-primary/5 p-6 font-serif text-2xl leading-relaxed">{session.question || "One question, clearly stated."}</blockquote>
      <p className="text-xs text-muted-foreground">If you need to revise the question, return to preparation rather than composing another one here.</p>
    </section> : null}
    {session.stage === "picture" ? <BeStillVisualization session={session} onChange={flow.update} disabled={flow.busy} /> : null}
    {session.stage === "listen" ? <section className="space-y-5">
      <QuietPrayerTimer key="listen" initialMinutes={5} title="Wait without forcing" onReflect={() => flow.update({ stage: "reflect" })} />
      <p className="text-center font-serif text-lg italic text-muted-foreground">Wait beside the still pond without throwing stones.</p>
    </section> : null}
    {session.stage === "reflect" ? <BeStillReflection session={session} onChange={flow.update} disabled={flow.busy} /> : null}
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="ghost" disabled={flow.busy || stageIndex === 0 || session.stage === "listen"} onClick={() => flow.update({ stage: STAGE_ORDER[stageIndex - 1] })} className="min-h-12 rounded-full"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden />Back</Button>
      {session.stage === "reflect" ? <Button type="button" disabled={flow.busy} onClick={() => void flow.complete()} className="min-h-12 rounded-full px-7">
        {flow.busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Check className="mr-2 h-4 w-4" aria-hidden />}Save my reflection
      </Button> : <Button type="button" disabled={flow.busy || (session.stage === "prepare" && !readyForStillness(session))} onClick={() => flow.update({ stage: STAGE_ORDER[stageIndex + 1] })} className="min-h-12 rounded-full px-7">{nextLabel}<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>}
    </div>
    <div className="mt-5 flex flex-col items-center gap-3 text-xs text-muted-foreground">
      <p role="status">{flow.draftStatus === "saving" ? "Keeping your draft…" : flow.draftStatus === "error" ? "Your draft needs attention." : "Draft kept on this device. Save when you finish."}</p>
      <div className="flex flex-wrap justify-center gap-5"><Link to="/prayer/be-still/ledger" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Receiving ledger</Link><Link to={returnTo} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{returnLabel}</Link></div>
    </div>
  </div>;
}
