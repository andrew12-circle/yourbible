import { BookOpen, Globe, Sparkles } from "lucide-react";
import {
  MY_AI_RESEARCH_SCOPE_HINTS,
  MY_AI_RESEARCH_SCOPE_LABELS,
  type MyAiResearchScope,
} from "@/lib/myai/researchScope";
import { myAiComposerPill } from "@/lib/myai/myAiTheme";
import { cn } from "@/lib/utils";

const SCOPES: {
  scope: MyAiResearchScope;
  icon: typeof BookOpen;
}[] = [
  { scope: "library", icon: BookOpen },
  { scope: "outside", icon: Sparkles },
  { scope: "web", icon: Globe },
];

type Props = {
  disabled?: boolean;
  onScope: (scope: MyAiResearchScope) => void;
  className?: string;
  compact?: boolean;
};

export default function MyAiResearchChips({ disabled, onScope, className, compact }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {SCOPES.map(({ scope, icon: Icon }) => (
        <button
          key={scope}
          type="button"
          disabled={disabled}
          title={MY_AI_RESEARCH_SCOPE_HINTS[scope]}
          onClick={() => onScope(scope)}
          className={cn(
            myAiComposerPill,
            compact && "px-2 py-0.5 text-[11px]",
            "disabled:pointer-events-none disabled:opacity-45",
          )}
        >
          <Icon className={cn("h-3 w-3 shrink-0 opacity-70", compact && "h-2.5 w-2.5")} aria-hidden />
          {MY_AI_RESEARCH_SCOPE_LABELS[scope]}
        </button>
      ))}
    </div>
  );
}
