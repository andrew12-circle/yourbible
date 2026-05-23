import {
  ArrowRight,
  Brain,
  Check,
  CirclePause,
  Clock,
  Leaf,
  MessageCircle,
  NotebookPen,
  Pencil,
  Play,
  Quote,
  Sparkles,
  Star,
  TriangleAlert,
  type LucideIcon,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ClaimEpistemologyPanel from "@/components/framework/ClaimEpistemologyPanel";
import ClaimIconActionButton from "@/components/framework/ClaimIconActionButton";
import ClaimScriptureRef from "@/components/framework/ClaimScriptureRef";
import type { ClaimEpistemology } from "@/lib/framework/epistemology";
import { getClaimSeekSeconds } from "@/lib/framework/claimPlaybackSync";
import {
  formatClaimVerdict,
  isDeferredVerdict,
  type ClaimVerdict,
} from "@/lib/framework/claimVerdict";
import { parseClaimEpistemology } from "@/lib/framework/epistemology";
import { cleanTranscriptQuoteForDisplay } from "@/lib/normalizePastedTranscript";
import { formatClaimSourceClock, formatTranscriptClock, type TranscriptSegment } from "@/lib/transcriptSplit";
import {
  artifactCard,
  artifactDesktopClaimCard,
  artifactMobileClaimCard,
  artifactScrollMt,
} from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

export type RenderClaimCardClaim = {
  id: string;
  claim: string;
  tone: string | null;
  doctrine_tags: string[];
  scripture_supports: { ref: string; note?: string }[];
  scripture_challenges: { ref: string; note?: string }[];
  match_relation: string | null;
  matched_belief_id: string | null;
  bias_flags: string[];
  verdict: string | null;
  epistemology?: ClaimEpistemology | null;
};

export type RenderClaimCardBelief = {
  statement: string;
  answer: string | null;
  confidence: number;
};

export type RenderClaimCardContext = {
  isDesktop: boolean;
  youTubeVideoId: string | null;
  claimSources: Record<string, TranscriptSegment | null>;
  matchedBeliefs: Record<string, RenderClaimCardBelief>;
  playClaimAtSource: (claim: RenderClaimCardClaim, source: TranscriptSegment | null | undefined) => void;
  startClaimResearchChat: (claim: RenderClaimCardClaim, source: TranscriptSegment | null | undefined) => void;
  openJournalFromClaim: (claim: RenderClaimCardClaim, startSeconds?: number) => void;
  toggleResearchLater: (cid: string, currentVerdict: string | null) => void | Promise<void>;
  applyClaimVerdict: (cid: string, verdict: ClaimVerdict | null) => void | Promise<void>;
  /** Fixed-width card in a horizontal rail (desktop or mobile). */
  layout?: "stack" | "desktopRail" | "mobileRail";
  activeClaimId?: string | null;
  followPlaybackActive?: boolean;
  actionsPlacement?: "inline" | "external";
};

type RenderClaimActionsOptions = {
  bordered?: boolean;
  wrap?: boolean;
  showSeparator?: boolean;
  className?: string;
};

function formatClaimChipLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(\s+|-)/)
    .map((part) => (part === "-" || /^\s+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

function getDoctrineChipIcon(tag: string): LucideIcon {
  const normalized = tag.toLowerCase();
  if (normalized.includes("mind") || normalized.includes("body")) return Brain;
  if (normalized.includes("sanct")) return Leaf;
  return Sparkles;
}

export function renderArtifactDetailClaimActions(
  c: RenderClaimCardClaim,
  ctx: RenderClaimCardContext,
  options: RenderClaimActionsOptions = {},
) {
  const source = ctx.claimSources[c.id];
  const railLayout = ctx.layout === "desktopRail" || ctx.layout === "mobileRail";
  const bordered = options.bordered ?? !railLayout;
  const wrap = options.wrap ?? true;
  const showSeparator = options.showSeparator ?? true;

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        wrap ? "flex-wrap" : "flex-nowrap",
        bordered && "border-t border-border/50 pt-3",
        options.className,
      )}
      role="toolbar"
      aria-label="Claim actions"
    >
      <ClaimIconActionButton
        label="Research"
        icon={MessageCircle}
        tone="research"
        active
        onClick={() => ctx.startClaimResearchChat(c, source)}
      />
      <ClaimIconActionButton
        label="Reflect"
        icon={NotebookPen}
        tone="reflect"
        onClick={() => ctx.openJournalFromClaim(c, source?.startSeconds ?? undefined)}
      />
      <ClaimIconActionButton
        label={isDeferredVerdict(c.verdict) ? "In queue (research later)" : "Research later"}
        icon={Clock}
        tone="researchLater"
        active={isDeferredVerdict(c.verdict)}
        onClick={() => void ctx.toggleResearchLater(c.id, c.verdict)}
      />
      {showSeparator ? <span className="mx-0.5 hidden h-5 w-px bg-border/60 sm:inline" aria-hidden /> : null}
      <ClaimIconActionButton
        label="Keep"
        icon={Check}
        tone="keep"
        active={c.verdict === "keep"}
        onClick={() => void ctx.applyClaimVerdict(c.id, "keep")}
      />
      <ClaimIconActionButton
        label="Reject"
        icon={X}
        tone="reject"
        active={c.verdict === "reject"}
        onClick={() => void ctx.applyClaimVerdict(c.id, "reject")}
      />
      <ClaimIconActionButton
        label="Update my belief"
        icon={Pencil}
        tone="update"
        active={c.verdict === "updated"}
        onClick={() => void ctx.applyClaimVerdict(c.id, "updated")}
      />
      <ClaimIconActionButton
        label="Defer"
        icon={CirclePause}
        tone="defer"
        active={c.verdict === "defer"}
        onClick={() => void ctx.applyClaimVerdict(c.id, "defer")}
      />
    </div>
  );
}

export function renderArtifactDetailClaimCard(
  c: RenderClaimCardClaim,
  claimIndex: number,
  ctx: RenderClaimCardContext,
) {
  const source = ctx.claimSources[c.id];
  const sourceClock = source ? formatClaimSourceClock(source.startSeconds, source.label) : null;
  const sourceQuote = source ? cleanTranscriptQuoteForDisplay(source.text) : "";
  const claimSeekSeconds = getClaimSeekSeconds(c, source ?? null);
  const canPlayClaim = Boolean(ctx.youTubeVideoId && claimSeekSeconds != null);
  const chapterClock =
    claimSeekSeconds != null && source?.startSeconds == null
      ? formatTranscriptClock(claimSeekSeconds)
      : null;
  const epistemology = parseClaimEpistemology(c.epistemology);
  const claimNumber = claimIndex + 1;
  const desktopRail = ctx.layout === "desktopRail";
  const mobileRail = ctx.layout === "mobileRail";
  const railLayout = desktopRail || mobileRail;
  const playbackActive = railLayout && ctx.followPlaybackActive && ctx.activeClaimId === c.id;
  const verdictAccent =
    c.verdict === "keep"
      ? "border-l-emerald-500"
      : c.verdict === "reject"
        ? "border-l-rose-500"
        : c.verdict === "updated"
          ? "border-l-indigo-500"
          : isDeferredVerdict(c.verdict)
            ? "border-l-amber-500"
            : "border-l-border";

  const claimToolbar =
    ctx.actionsPlacement === "external" ? null : renderArtifactDetailClaimActions(c, ctx);

  const sourceSection = (
    <div
      className={cn(
        "rounded-[1.65rem] border border-white/70 bg-white/85 p-4 text-xs shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-black/[0.03] sm:p-5",
        "dark:border-border/50 dark:bg-card/80 dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]",
        railLayout && "bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.08)]",
      )}
    >
      <div className="mb-4 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 shadow-inner dark:bg-slate-800 dark:text-slate-300">
          <Quote className="h-4 w-4" aria-hidden />
        </span>
        Source in transcript
      </div>
      {source ? (
        <div className="space-y-4">
          <button
            type="button"
            disabled={!canPlayClaim && source.startSeconds == null}
            onClick={() => ctx.playClaimAtSource(c, source)}
            className={cn(
              "w-full space-y-3.5 rounded-2xl text-left transition-colors",
              (canPlayClaim || source.startSeconds != null) &&
                "cursor-pointer hover:bg-slate-50/80 -mx-2 px-2 py-1 dark:hover:bg-slate-900/35",
            )}
          >
            {sourceClock ? (
              <p className="font-mono text-lg font-bold tabular-nums tracking-tight text-foreground">
                [{sourceClock}]
              </p>
            ) : null}
            {sourceQuote ? (
              <p
                className={cn(
                  "font-sans text-[15px] leading-8 text-foreground sm:text-base",
                  railLayout ? "line-clamp-6" : "line-clamp-5",
                )}
              >
                {sourceQuote}
              </p>
            ) : (
              <p className="font-sans text-sm leading-relaxed italic text-muted-foreground">
                Transcript excerpt unavailable.
              </p>
            )}
          </button>
          <Button
            size="sm"
            variant="outline"
            className="mt-0.5 h-11 rounded-full border-white/80 bg-white px-5 text-sm font-semibold text-blue-700 shadow-[0_10px_28px_rgba(15,23,42,0.12)] hover:bg-blue-50 hover:text-blue-800 dark:border-border/60 dark:bg-background dark:text-blue-300 dark:hover:bg-blue-950/30"
            disabled={!ctx.youTubeVideoId && claimSeekSeconds == null && source.startSeconds == null}
            onClick={() => ctx.playClaimAtSource(c, source)}
          >
            <Play className="mr-2 h-4 w-4 fill-current" aria-hidden />
            {canPlayClaim && (sourceClock || chapterClock)
              ? `Play from ${sourceClock ?? chapterClock}`
              : source.label
                ? `Jump to ${formatClaimSourceClock(null, source.label) ?? source.label}`
                : "Jump to transcript"}
          </Button>
        </div>
      ) : canPlayClaim ? (
        <div className="space-y-3">
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            No linked transcript line — playback uses the chapter time for this claim.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-0.5 h-11 rounded-full border-white/80 bg-white px-5 text-sm font-semibold text-blue-700 shadow-[0_10px_28px_rgba(15,23,42,0.12)] hover:bg-blue-50 hover:text-blue-800"
            onClick={() => ctx.playClaimAtSource(c, source)}
          >
            <Play className="mr-2 h-4 w-4 fill-current" aria-hidden />
            {chapterClock ? `Play from ${chapterClock}` : "Play from chapter"}
          </Button>
        </div>
      ) : (
        <p className="font-sans text-sm leading-relaxed text-muted-foreground">
          No exact transcript section was detected for this older analysis. Re-analyze after the timestamped
          transcript update for stronger source links.
        </p>
      )}
    </div>
  );

  const tagsSection = (
    <div className="flex flex-wrap gap-2.5 text-sm font-medium">
      {c.tone ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white/90 px-3.5 py-2 text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02]">
          <Zap className="h-4 w-4 text-rose-500" aria-hidden />
          Tone: {formatClaimChipLabel(c.tone)}
        </span>
      ) : null}
      {(c.doctrine_tags ?? []).map((t) => {
        const DoctrineIcon = getDoctrineChipIcon(t);
        const doctrineTone = DoctrineIcon === Leaf ? "text-emerald-600" : "text-blue-600";
        return (
          <span
            key={t}
            className="inline-flex items-center gap-2 rounded-full border border-border/45 bg-white/90 px-3.5 py-2 text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02]"
          >
            <DoctrineIcon className={cn("h-4 w-4", doctrineTone)} aria-hidden />
            {formatClaimChipLabel(t)}
          </span>
        );
      })}
      {c.match_relation ? (
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02]",
            c.match_relation === "agree"
              ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"
              : c.match_relation === "disagree"
                ? "border-rose-200/80 bg-rose-50 text-rose-800"
                : "border-amber-200/80 bg-amber-50 text-amber-900",
          )}
        >
          <Star className="h-4 w-4" aria-hidden />
          {c.match_relation === "new"
            ? "New to Your Framework"
            : `You ${formatClaimChipLabel(c.match_relation)}`}
        </span>
      ) : null}
      {(c.bias_flags ?? []).map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3.5 py-2 text-amber-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02]"
        >
          <TriangleAlert className="h-4 w-4" aria-hidden />
          {formatClaimChipLabel(f)}
        </span>
      ))}
    </div>
  );

  const beliefSection =
    c.matched_belief_id && ctx.matchedBeliefs[c.matched_belief_id] ? (
      <div className="rounded-lg border border-border/70 bg-background/55 p-3.5 text-xs space-y-2.5 backdrop-blur-[2px] sm:p-4 dark:bg-background/20">
        <div className="uppercase tracking-wider text-muted-foreground">Your current belief context</div>
        <div>
          <p className="font-medium text-foreground">{ctx.matchedBeliefs[c.matched_belief_id].statement}</p>
          {ctx.matchedBeliefs[c.matched_belief_id].answer ? (
            <p className="text-muted-foreground mt-1 line-clamp-3">{ctx.matchedBeliefs[c.matched_belief_id].answer}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-background border border-border">
            confidence {ctx.matchedBeliefs[c.matched_belief_id].confidence}%
          </span>
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            {c.match_relation === "agree"
              ? "reinforces what you already believe"
              : c.match_relation === "disagree"
                ? "challenges your current belief"
                : "partly overlaps with your current belief"}
          </span>
        </div>
      </div>
    ) : null;

  const scriptureSection = (
    <div className={cn("grid grid-cols-2 gap-4 text-xs", railLayout && "gap-3")}>
      <div className="min-w-0 space-y-3">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground">
          Supports
        </div>
        <ul className="space-y-2">
          {c.scripture_supports?.length ? (
            c.scripture_supports.map((s, i) => (
              <ClaimScriptureRef
                key={`${s.ref}-${i}`}
                reference={s.ref}
                note={s.note}
                compact={railLayout}
              />
            ))
          ) : (
            <li className="rounded-2xl border border-dashed border-border/60 bg-white/60 px-3 py-4 text-sm text-muted-foreground">
              No supporting references yet.
            </li>
          )}
        </ul>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground">
          Challenges
        </div>
        <ul className="space-y-2">
          {c.scripture_challenges?.length ? (
            c.scripture_challenges.map((s, i) => (
              <ClaimScriptureRef
                key={`${s.ref}-${i}`}
                reference={s.ref}
                note={s.note}
                compact={railLayout}
              />
            ))
          ) : (
            <li className="rounded-2xl border border-dashed border-border/60 bg-white/60 px-3 py-4 text-sm text-muted-foreground">
              No challenging references yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );

  const claimBody = (
    <>
      {sourceSection}
      {tagsSection}
      {beliefSection}
      <ClaimEpistemologyPanel epistemology={epistemology} className="mb-0" />
      {railLayout || (c.scripture_supports?.length ?? 0) + (c.scripture_challenges?.length ?? 0) > 0
        ? scriptureSection
        : null}
      {claimToolbar}
    </>
  );

  if (railLayout) {
    const railPadX = mobileRail ? "px-4" : "px-5";
    return (
      <article
        key={c.id}
        id={c.id}
        data-claim-number={claimNumber}
        data-claim-playback-active={playbackActive ? "" : undefined}
        className={cn(
          mobileRail ? artifactMobileClaimCard : artifactDesktopClaimCard,
          playbackActive && "ring-2 ring-violet-500/35 ring-offset-2 ring-offset-background",
          isDeferredVerdict(c.verdict) && !playbackActive && "ring-1 ring-amber-300/50",
        )}
      >
        <header className={cn("shrink-0 space-y-2.5 border-b border-border/50 pb-4 pt-5", railPadX)}>
          <span
            className="font-mono text-sm font-medium tabular-nums text-muted-foreground"
            aria-label={`Claim ${claimNumber}`}
          >
            #{claimNumber}
          </span>
          <p
            className={cn(
              "font-semibold leading-snug text-foreground",
              mobileRail ? "text-base" : "text-[15px]",
            )}
          >
            {c.claim}
          </p>
          {c.verdict ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                isDeferredVerdict(c.verdict)
                  ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
                  : "bg-muted text-foreground",
              )}
            >
              {formatClaimVerdict(c.verdict)}
            </span>
          ) : null}
        </header>
        <div
          className={cn(
            "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain py-4 scrollbar-thin",
            railPadX,
          )}
        >
          {sourceSection}
          {tagsSection}
          {beliefSection}
          <ClaimEpistemologyPanel epistemology={epistemology} className="mb-0" />
          {scriptureSection}
        </div>
        <footer className={cn("shrink-0 border-t border-border/50 bg-white py-3.5", railPadX)}>
          {claimToolbar}
        </footer>
      </article>
    );
  }

  if (!ctx.isDesktop) {
    return <div className="space-y-3">{claimBody}</div>;
  }

  return (
    <article
      key={c.id}
      id={c.id}
      data-claim-number={claimNumber}
      className={cn(
        artifactCard,
        artifactScrollMt,
        "space-y-4 border-l-4 p-4 sm:p-5",
        verdictAccent,
        isDeferredVerdict(c.verdict) && "ring-1 ring-amber-400/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className="shrink-0 font-mono text-sm font-semibold tabular-nums text-muted-foreground"
            aria-label={`Claim ${claimNumber}`}
          >
            #{claimNumber}
          </span>
          <p className="font-display text-base leading-relaxed text-foreground">{c.claim}</p>
        </div>
        {c.verdict ? (
          <span
            className={cn(
              "shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded",
              isDeferredVerdict(c.verdict)
                ? "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100"
                : "bg-foreground text-background",
            )}
          >
            {formatClaimVerdict(c.verdict)}
          </span>
        ) : null}
      </div>
      {claimBody}
    </article>
  );
}
