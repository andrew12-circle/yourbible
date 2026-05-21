import ArtifactMobileClaimShell from "@/components/framework/artifact-detail/ArtifactMobileClaimShell";
import ClaimsGlossary, { type ClaimsGlossaryEntry } from "@/components/framework/ClaimsGlossary";
import { useIsDesktop } from "@/hooks/use-desktop";
import { artifactCard, artifactScrollMtMobile } from "@/lib/framework/artifactSurfaces";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";
import type { ClaimChapterGroup } from "@/lib/framework/groupClaimsUnderYoutubeChapters";

type ClaimLike = { id: string; claim: string; verdict: string | null };

type Props<T extends ClaimLike> = {
  claims: T[];
  claimChapterLayout: { grouped: boolean; groups: ClaimChapterGroup<T>[] };
  glossaryEntries: ClaimsGlossaryEntry[];
  youTubeVideoId: string | null;
  onJumpToClaim: (claimId: string) => void;
  onSeekChapter: (seconds: number) => void;
  renderClaimCard: (claim: T, claimIndex: number) => React.ReactNode;
  /** Mobile: one claim open at a time; first claim open by default. */
  mobileOpenClaimId?: string | null;
  onMobileOpenClaimIdChange?: (claimId: string | null) => void;
  /** Persist claims-index open state per artifact. */
  claimsIndexStorageKey?: string;
};

export default function ArtifactClaimsSection<T extends ClaimLike>({
  claims,
  claimChapterLayout,
  glossaryEntries,
  youTubeVideoId,
  onJumpToClaim,
  onSeekChapter,
  renderClaimCard,
  mobileOpenClaimId,
  onMobileOpenClaimIdChange,
  claimsIndexStorageKey,
}: Props<T>) {
  const isDesktop = useIsDesktop();
  const useMobileAccordion = onMobileOpenClaimIdChange != null;

  const wrapCard = (claim: T, claimIndex: number) => {
    const card = renderClaimCard(claim, claimIndex);
    if (!useMobileAccordion) return card;
    const claimNumber = claimIndex + 1;
    return (
      <ArtifactMobileClaimShell
        key={claim.id}
        claim={claim}
        claimNumber={claimNumber}
        open={mobileOpenClaimId === claim.id}
        onOpenChange={(open) => {
          if (open) onMobileOpenClaimIdChange(claim.id);
          else if (mobileOpenClaimId === claim.id) onMobileOpenClaimIdChange(null);
        }}
      >
        {card}
      </ArtifactMobileClaimShell>
    );
  };

  return (
    <div
      id="claims"
      className={cn(
        "max-w-4xl",
        isDesktop ? "scroll-mt-24" : artifactScrollMtMobile,
      )}
    >
      <div
        className={cn(
          artifactCard,
          "border border-amber-200/70 bg-amber-50/55 p-3 dark:border-amber-900/50 dark:bg-amber-950/25 sm:p-4",
          isDesktop ? "space-y-5" : "space-y-4",
        )}
      >
        <ClaimsGlossary
          entries={glossaryEntries}
          onJump={onJumpToClaim}
          compact={!isDesktop}
          storageKey={claimsIndexStorageKey}
          className={cn(
            "border-amber-200/60 bg-background/60 dark:border-amber-900/40 dark:bg-background/30",
            isDesktop ? "mb-0" : "mb-0",
          )}
        />
        <div className={isDesktop ? "space-y-8" : "space-y-5"}>
        {claimChapterLayout.grouped ? (
          claimChapterLayout.groups.map((group) => (
            <div key={group.id} className={isDesktop ? "space-y-3" : "space-y-2"}>
              <div
                className={cn(
                  "sticky top-0 z-[5] flex items-center justify-between gap-2 text-sm font-medium text-foreground",
                  isDesktop
                    ? "-mx-1 mb-1 rounded-md border border-border/60 bg-muted/40 px-3 py-2"
                    : "mb-0 border-b border-border/40 bg-background/95 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80",
                )}
              >
                <span className="min-w-0 leading-snug">{group.title}</span>
                {group.chapterStartSeconds != null ? (
                  youTubeVideoId ? (
                    <button
                      type="button"
                      className="shrink-0 font-mono text-xs font-normal tabular-nums text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      onClick={() => onSeekChapter(group.chapterStartSeconds!)}
                    >
                      {formatTranscriptClock(group.chapterStartSeconds)}
                    </button>
                  ) : (
                    <span className="shrink-0 font-mono text-xs font-normal tabular-nums text-muted-foreground">
                      {formatTranscriptClock(group.chapterStartSeconds)}
                    </span>
                  )
                ) : null}
              </div>
              <div className={isDesktop ? "space-y-5" : "space-y-3"}>
                {group.claims.map((c) =>
                  wrapCard(c, Math.max(0, claims.findIndex((x) => x.id === c.id))),
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={isDesktop ? "space-y-5" : "space-y-3"}>{claims.map((c, i) => wrapCard(c, i))}</div>
        )}
        </div>
      </div>
    </div>
  );
}
