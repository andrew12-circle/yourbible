import { BookOpen, Globe, Sparkles } from "lucide-react";
import {
  MY_AI_RESEARCH_SCOPE_HINTS,
  MY_AI_RESEARCH_SCOPE_LABELS,
  type MyAiResearchScope,
} from "@/lib/myai/researchScope";
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
};

export default function MyAiResearchChips({ disabled, onScope, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {SCOPES.map(({ scope, icon: Icon }) => (
        <button
          key={scope}
          type="button"
          disabled={disabled}
          title={MY_AI_RESEARCH_SCOPE_HINTS[scope]}
          onClick={() => onScope(scope)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2.5 py-1",
            "text-[11px] font-medium text-muted-foreground transition-colors",
            "hover:border-blue-500/35 hover:bg-blue-500/5 hover:text-foreground",
            "disabled:pointer-events-none disabled:opacity-45",
          )}
        >
          <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
          {MY_AI_RESEARCH_SCOPE_LABELS[scope]}
        </button>
      ))}
    </div>
  );
}
