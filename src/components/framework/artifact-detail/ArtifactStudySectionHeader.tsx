import { ChevronRight } from "lucide-react";
import { artifactStudySectionTitle } from "@/lib/framework/artifactSurfaces";
import { artifactStudyCount, artifactStudyLink } from "@/lib/framework/artifactStudyTheme";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  count?: number | string;
  countLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export default function ArtifactStudySectionHeader({
  title,
  description,
  count,
  countLabel,
  actionLabel,
  onAction,
  className,
}: Props) {
  const countText =
    count != null
      ? countLabel ?? (typeof count === "number" ? `${count}` : count)
      : null;

  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div className="flex items-start justify-between gap-3 md:gap-4">
        <h3 className={cn(artifactStudySectionTitle, "md:text-xl")}>{title}</h3>
        {countText ? (
          <span className={cn("shrink-0 pt-0.5 text-xs tabular-nums", artifactStudyCount)}>{countText}</span>
        ) : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className={cn(
              "shrink-0 inline-flex items-center gap-0.5 pt-0.5 text-xs underline-offset-2 hover:underline",
              artifactStudyLink,
            )}
          >
            {actionLabel}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      {description ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:line-clamp-2">
          {description}
        </p>
      ) : null}
    </div>
  );
}
