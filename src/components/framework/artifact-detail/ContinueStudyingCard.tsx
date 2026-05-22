import { ChevronRight, LayoutList, Sparkles, Users } from "lucide-react";
import { artifactPremiumCard } from "@/lib/framework/artifactSurfaces";
import {
  artifactContinueCardHover,
  artifactStudyIconWell,
  artifactStudyLink,
} from "@/lib/framework/artifactStudyTheme";
import { cn } from "@/lib/utils";

export type ContinueStudyingIcon = "chapters" | "people" | "insights";

type Props = {
  title: string;
  description: string;
  onClick: () => void;
  icon: ContinueStudyingIcon;
  className?: string;
};

export default function ContinueStudyingCard({ title, description, onClick, icon, className }: Props) {
  const Icon = icon === "chapters" ? LayoutList : icon === "people" ? Users : Sparkles;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        artifactPremiumCard,
        "group flex min-h-[120px] min-w-[200px] max-w-[240px] shrink-0 snap-start flex-col justify-between p-4 text-left transition",
        artifactContinueCardHover,
        className,
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
