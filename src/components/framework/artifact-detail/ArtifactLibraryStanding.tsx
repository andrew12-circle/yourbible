import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Layers, Loader2, RefreshCw } from "lucide-react";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  beliefAlignmentFromCounts,
  corpusResonanceLabel,
  formatSimilarityPct,
  type CorpusPeerMatch,
} from "@/lib/framework/artifactCorpusStanding";
import { artifactCard, artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";
import { BeliefAlignmentBar } from "@/components/framework/BeliefAlignmentBar";

type Props = {
  artifactId: string;
  claimsCount: number;
  agreeCount: number;
  disagreeCount: number;
  newCount: number;
  peerLibraryCount: number;
  peers: CorpusPeerMatch[];
  echoClaimCount: number;
  loading: boolean;
  error: string | null;
  embeddingPending?: boolean;
  onReload?: () => void;
  className?: string;
  headerClassName?: string;
  /** When wrapped in an outer collapsible (mobile overview). */
  hideHeader?: boolean;
};

function PeerRow({ peer, currentArtifactId }: { peer: CorpusPeerMatch; currentArtifactId: string }) {
  const title = peer.peerTitle ?? "Untitled source";
  return (
    <li className="rounded-xl border border-border/50 bg-background/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/framework/artifacts/${peer.peerArtifactId}`}
            className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
          >
            {title}
          </Link>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {corpusResonanceLabel(peer.avgSimilarity)} · {formatSimilarityPct(peer.avgSimilarity)} avg match
            {peer.strongMatchCount > 0 ? (
              <span> · {peer.strongMatchCount} echo{peer.strongMatchCount === 1 ? "" : "es"}</span>
            ) : null}
          </p>
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
      </div>
      {peer.topSourceClaim && peer.topPeerClaim ? (
        <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
          <p className="line-clamp-2">
            <span className="font-medium text-foreground/80">Here:</span> {peer.topSourceClaim}
          </p>
          <p className="line-clamp-2">
            <span className="font-medium text-foreground/80">Echoes in library:</span> {peer.topPeerClaim}
          </p>
        </div>
      ) : null}
      <span className="sr-only">Compared with current artifact {currentArtifactId}</span>
    </li>
  );
}

export default function ArtifactLibraryStanding({
  artifactId,
  claimsCount,
  agreeCount,
  disagreeCount,
  newCount,
  peerLibraryCount,
  peers,
  echoClaimCount,
  loading,
  error,
  embeddingPending = false,
  onReload,
  className,
  headerClassName,
  hideHeader = false,
}: Props) {
  const navigate = useNavigate();
  const alignment = beliefAlignmentFromCounts(agreeCount, disagreeCount, newCount);
  const hasLibrary = peerLibraryCount > 0;
  const showPeers = hasLibrary && peers.length > 0;

  return (
    <section
      id={hideHeader ? undefined : "library-standing"}
      className={cn(
        hideHeader ? "space-y-0" : cn(artifactScrollMt, "scroll-mt-28"),
        "space-y-4",
        className,
      )}
      aria-label="Library standing"
    >
      {!hideHeader ? (
        <ArtifactStudySectionHeader
          title="In your library"
          description="How this source compares to everything else you've fed in — and to your beliefs."
          actionLabel={hasLibrary ? "Full library map" : undefined}
          onAction={hasLibrary ? () => navigate("/framework/library-standing") : undefined}
          className={headerClassName}
        />
      ) : null}

      <div className={cn(artifactCard, "space-y-5 p-4 sm:p-5 md:p-6")}>
        {claimsCount > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              vs. your beliefs
            </div>
            <BeliefAlignmentBar alignment={alignment} />
          </div>
        ) : null}

        {loading || embeddingPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {embeddingPending ? "Indexing claims for library comparison…" : "Scanning your library…"}
          </div>
        ) : null}

        {error && !embeddingPending ? (
          <div className="flex flex-col gap-2 text-sm text-destructive">
            <div className="flex flex-wrap items-center gap-2">
              <span>Could not load library comparison.</span>
              {onReload ? (
                <Button type="button" size="sm" variant="outline" onClick={onReload}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Retry
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
        ) : null}

        {!loading && !error && !embeddingPending ? (
          <>
            {!hasLibrary ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Layers className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
                <p>This is your first ready source. Add more sermons or talks to see how themes echo across your library.</p>
              </div>
            ) : showPeers ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  vs. your other sources
                </div>
                <p className="text-sm text-muted-foreground">
                  {echoClaimCount > 0 && claimsCount > 0 ? (
                    <>
                      <span className="font-medium text-foreground">{echoClaimCount}</span> of{" "}
                      <span className="font-medium text-foreground">{claimsCount}</span> claims echo themes you&apos;ve
                      heard before.
                    </>
                  ) : (
                    <>No strong echoes yet — this source may be covering new ground for you.</>
                  )}
                </p>
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                      aria-hidden
                    />
                    <span>
                      {peers.length} library match{peers.length === 1 ? "" : "es"}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2.5 pt-2.5">
                    <ul className="space-y-2.5">
                      {peers.slice(0, 5).map((peer) => (
                        <PeerRow key={peer.peerArtifactId} peer={peer} currentArtifactId={artifactId} />
                      ))}
                    </ul>
                    {peers.length > 5 ? (
                      <Link
                        to="/framework/library-standing"
                        className="inline-flex text-xs font-medium text-primary hover:underline"
                      >
                        See all {peers.length} library matches
                      </Link>
                    ) : null}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                You have {peerLibraryCount} other source{peerLibraryCount === 1 ? "" : "s"} in your library, but no
                strong thematic echoes yet. This source may be covering new ground for you.
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
