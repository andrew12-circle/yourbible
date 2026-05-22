import {
  ArrowRight,
  Check,
  CirclePause,
  Clock,
  MessageCircle,
  NotebookPen,
  Pencil,
  Quote,
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
};

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

  const claimToolbar = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        !railLayout && "border-t border-border/50 pt-3",
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
      <span className="mx-0.5 hidden h-5 w-px bg-border/60 sm:inline" aria-hidden />
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

  const sourceSection = (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/15 p-3.5 text-xs sm:p-4",
        railLayout && "bg-white",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <Quote className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        Source in transcript
      </div>
        {source ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={!canPlayClaim && source.startSeconds == null}
              onClick={() => ctx.playClaimAtSource(c, source)}
              className={cn(
                "w-full space-y-3 rounded-md text-left transition-colors",
                (canPlayClaim || source.startSeconds != null) &&
                  "cursor-pointer hover:bg-muted/40 -mx-1 px-1 py-0.5",
              )}
            >
              {sourceClock ? (
                <p className="font-mono text-sm font-medium tabular-nums tracking-tight text-foreground/90">
                  [{sourceClock}]
                </p>
              ) : null}
              {sourceQuote ? (
                <p
                  className={cn(
                    "font-sans text-sm leading-relaxed text-foreground",
                    railLayout ? "line-clamp-6" : "line-clamp-4",
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
              className="mt-0.5 h-8 rounded-full border-border/70 bg-white px-4 text-xs font-medium shadow-sm hover:bg-muted/30"
              disabled={!ctx.youTubeVideoId && claimSeekSeconds == null && source.startSeconds == null}
              onClick={() => ctx.playClaimAtSource(c, source)}
            >
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
            <Button size="sm" variant="outline" className="mt-0.5" onClick={() => ctx.playClaimAtSource(c, source)}>
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
    <div className="flex flex-wrap gap-1.5 text-[10px] font-medium uppercase tracking-wider">
      {c.tone ? (
        <span className="rounded-md border border-border/60 bg-white px-2 py-0.5 text-muted-foreground">
          tone: {c.tone}
        </span>
      ) : null}
      {(c.doctrine_tags ?? []).map((t) => (
        <span
          key={t}
          className="rounded-md border border-border/60 bg-white px-2 py-0.5 text-muted-foreground"
        >
          {t}
        </span>
      ))}
      {c.match_relation ? (
        <span
          className={cn(
            "rounded-md border px-2 py-0.5",
            c.match_relation === "agree"
              ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"
              : c.match_relation === "disagree"
                ? "border-rose-200/80 bg-rose-50 text-rose-800"
                : "border-amber-200/80 bg-amber-50 text-amber-900",
          )}
        >
          {c.match_relation === "new" ? "new to your framework" : `you ${c.match_relation}`}
        </span>
      ) : null}
      {(c.bias_flags ?? []).map((f) => (
        <span
          key={f}
          className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-amber-900"
        >
          ⚠ {f}
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
    <div className={cn("grid grid-cols-2 gap-3 text-xs", railLayout && "gap-3")}>
      <div className="space-y-2 min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
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
            <li className="text-sm text-muted-foreground">—</li>
          )}
        </ul>
      </div>
      <div className="space-y-2 min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
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
            <li className="text-sm text-muted-foreground">—</li>
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
          {railLayout ||
          (c.scripture_supports?.length ?? 0) + (c.scripture_challenges?.length ?? 0) > 0
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
          <p className="text-[15px] font-semibold leading-snug text-foreground">{c.claim}</p>
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
