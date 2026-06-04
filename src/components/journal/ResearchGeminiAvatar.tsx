import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { geminiSparkleIcon } from "@/lib/journal/claimResearchTheme";

type Props = {
  size?: "sm" | "md";
  className?: string;
};

export default function ResearchGeminiAvatar({ size = "sm", className }: Props) {
  const dim = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        geminiSparkleIcon,
        dim,
        className,
      )}
      aria-hidden
    >
      <Sparkles className={icon} strokeWidth={2.25} />
    </span>
  );
}
