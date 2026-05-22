import ContinueStudyingCard, {
  type ContinueStudyingIcon,
} from "@/components/framework/artifact-detail/ContinueStudyingCard";
import ArtifactMobileInsightHeroRail from "@/components/framework/artifact-detail/ArtifactMobileInsightHeroRail";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import { artifactHorizontalRail } from "@/lib/framework/artifactSurfaces";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";

type ClaimLike = {
  id: string;
  claim: string;
  verdict: string | null;
  scripture_supports?: { ref: string; note?: string }[];
};

type ContinueCard = {
  id: string;
  title: string;
  description: string;
  hash: string;
  icon: ContinueStudyingIcon;
};

type Props = {
  claims: ClaimLike[];
  artifactId: string;
  artifactStatus: string;
  claimsCount: number;
  entitiesCount?: number;
  showChapters: boolean;
  showTeachingsSpine: boolean;
  onNavigate: (hash: string) => void;
  onSelectClaim: (claimId: string) => void;
  activeClaimId?: string | null;
  claimSources?: Record<string, TranscriptSegment | null>;
  onSeeScripture?: (claimId: string) => void;
  className?: string;
};

export default function ArtifactMobileOverview({
  claims,
  artifactId,
  artifactStatus,
  claimsCount,
  entitiesCount,
  showChapters,
  showTeachingsSpine,
  onNavigate,
  onSelectClaim,
  activeClaimId,
  onSeeScripture,
  className,
}: Props) {
  const continueCards: ContinueCard[] = [];
  if (showChapters) {
    continueCards.push({
      id: "chapters",
      title: "Study spine",
      description: "Jump through chapters synced from the creator's outline.",
      hash: "#chapters",
      icon: "chapters",
    });
  } else if (showTeachingsSpine) {
    continueCards.push({
      id: "teachings",
      title: "Study spine",
      description: "Teachings extracted when no chapter outline exists yet.",
      hash: "#study-spine-teachings",
      icon: "chapters",
    });
  }
  continueCards.push({
    id: "people",
    title: "People & themes",
    description: "People, books, scriptures, and recurring themes in this talk.",
    hash: "#people-themes",
    icon: "people",
  });
  if (claimsCount > 0) {
    continueCards.push({
      id: "insights",
      title: "Key insights",
      description: "Thesis-sized lines from the transcript to review against scripture.",
      hash: "#key-insights",
      icon: "insights",
    });
  }

  return (
    <section
      id="overview"
      className={cn("space-y-10", className)}
      aria-label="Study overview"
    >
      {continueCards.length > 0 ? (
        <div className="space-y-4">
          <ArtifactStudySectionHeader title="Continue studying" />
          <div className={cn(artifactHorizontalRail, "pb-1")} role="list">
            {continueCards.map((card) => (
              <ContinueStudyingCard
                key={card.id}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onClick={() => onNavigate(card.hash)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {claimsCount > 0 ? (
        <div id="key-insights" className="scroll-mt-4 space-y-4">
          <ArtifactStudySectionHeader
            title="Key insights"
            count={claimsCount}
            countLabel={`${claimsCount} insights`}
            actionLabel="View all"
            onAction={() => onNavigate("#claims")}
          />
          <ArtifactMobileInsightHeroRail
            claims={claims}
            activeClaimId={activeClaimId}
            onSelectClaim={onSelectClaim}
            onSeeScripture={onSeeScripture}
          />
        </div>
      ) : null}

      <div id="people-themes" className="scroll-mt-4 space-y-4">
        <ArtifactStudySectionHeader
          title="People & themes"
          count={entitiesCount}
          countLabel={entitiesCount != null ? `${entitiesCount} mentioned` : undefined}
          actionLabel="Explore all"
          onAction={() => onNavigate("#entities")}
        />
        <ArtifactEntitiesPanel
          artifactId={artifactId}
          artifactStatus={artifactStatus}
          variant="mobileRail"
        />
      </div>
    </section>
  );
}
