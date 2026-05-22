import { ChevronRight, LayoutList, Sparkles, Users } from "lucide-react";
import ArtifactEntitiesPanel from "@/components/framework/ArtifactEntitiesPanel";
import ArtifactInsightRail from "@/components/framework/artifact-detail/ArtifactInsightRail";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import { artifactPremiumCard, artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import {
  artifactContinueCardHover,
  artifactStudyIconWell,
  artifactStudyLink,
} from "@/lib/framework/artifactStudyTheme";
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
  icon: "chapters" | "people" | "insights";
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
  claimSources?: Record<string, TranscriptSegment | null>;
  onSeeScripture?: (claimId: string) => void;
  onSeeInTranscript?: (claimId: string) => void;
  className?: string;
};

function ContinueStudyingCard({
  title,
  description,
  onClick,
  icon,
}: {
  title: string;
  description: string;
  onClick: () => void;
  icon: ContinueCard["icon"];
}) {
  const Icon = icon === "chapters" ? LayoutList : icon === "people" ? Users : Sparkles;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        artifactPremiumCard,
        "group flex min-h-[120px] min-w-[200px] max-w-[240px] shrink-0 snap-start flex-col justify-between p-4 text-left transition",
        artifactContinueCardHover,
      )}
    >
      <div>
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl transition",
            artifactStudyIconWell[icon],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h4 className="font-display mt-3 text-base font-semibold text-foreground">{title}</h4>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <span className={cn("mt-3 inline-flex items-center gap-0.5 text-xs", artifactStudyLink)}>
        Open
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </button>
  );
}

export default function ArtifactDesktopOverview({
  claims,
  artifactId,
  artifactStatus,
  claimsCount,
  entitiesCount,
  showChapters,
  showTeachingsSpine,
  onNavigate,
  onSelectClaim,
  claimSources,
  onSeeScripture,
  onSeeInTranscript,
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
      className={cn(artifactScrollMt, "space-y-10", className)}
      aria-label="Overview"
    >
      {continueCards.length > 0 ? (
        <div className="space-y-4">
          <ArtifactStudySectionHeader title="Continue studying" />
          <div
            className={cn(
              "flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hide pb-1 touch-pan-x",
            )}
            role="list"
          >
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
        <div id="key-insights" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28")}>
          <ArtifactStudySectionHeader
            title="Key claims"
            count={claimsCount}
            countLabel={`${claimsCount} claims extracted`}
            actionLabel="View all"
            onAction={() => onNavigate("#claims")}
          />
          <ArtifactInsightRail
            claims={claims}
            claimSources={claimSources}
            onSelectClaim={onSelectClaim}
            onSeeInTranscript={onSeeInTranscript}
            onSeeScripture={onSeeScripture}
          />
        </div>
      ) : null}

      <div id="people-themes" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28")}>
        <ArtifactStudySectionHeader
          title="People & themes"
          count={entitiesCount}
          countLabel={entitiesCount != null ? `${entitiesCount} mentioned` : undefined}
          actionLabel="Full index"
          onAction={() => onNavigate("#entities")}
        />
        <ArtifactEntitiesPanel
          artifactId={artifactId}
          artifactStatus={artifactStatus}
          variant="desktopRail"
        />
      </div>
    </section>
  );
}
