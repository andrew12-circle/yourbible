import ClaimsGlossary, { type ClaimsGlossaryEntry } from "@/components/framework/ClaimsGlossary";
import { formatTranscriptClock } from "@/lib/transcriptSplit";
import type { ClaimChapterGroup } from "@/lib/framework/groupClaimsUnderYoutubeChapters";

type ClaimLike = { id: string };

type Props<T extends ClaimLike> = {
  claims: T[];
  claimChapterLayout: { grouped: boolean; groups: ClaimChapterGroup<T>[] };
  glossaryEntries: ClaimsGlossaryEntry[];
  youTubeVideoId: string | null;
  onJumpToClaim: (claimId: string) => void;
  onSeekChapter: (seconds: number) => void;
  renderClaimCard: (claim: T, claimIndex: number) => React.ReactNode;
};

export default function ArtifactClaimsSection<T extends ClaimLike>({
  claims,
  claimChapterLayout,
  glossaryEntries,
  youTubeVideoId,
  onJumpToClaim,
  onSeekChapter,
  renderClaimCard,
}: Props<T>) {
  return (
    <div id="claims" className="scroll-mt-24 max-w-4xl space-y-6">
      <ClaimsGlossary entries={glossaryEntries} onJump={onJumpToClaim} className="mb-2" />
      <div className="space-y-8">
        {claimChapterLayout.grouped ? (
          claimChapterLayout.groups.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="sticky top-0 z-[5] -mx-1 mb-1 flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
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
              <div className="space-y-5">
                {group.claims.map((c) =>
                  renderClaimCard(c, Math.max(0, claims.findIndex((x) => x.id === c.id))),
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-5">{claims.map((c, i) => renderClaimCard(c, i))}</div>
        )}
      </div>
    </div>
  );
}
