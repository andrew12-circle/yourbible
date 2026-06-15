import {
  Brain,
  FileStack,
  NotebookPen,
  ScanSearch,
  Sparkles,
  UserRound,
  Users,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import { OpenAiMark } from "@/components/myai/OpenAiMark";
import type { CitationSourceKind } from "@/lib/myai/citationSourceStyle";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<CitationSourceKind, LucideIcon>> = {
  youtube: Youtube,
  claim_research: ScanSearch,
  belief: Brain,
  journal: NotebookPen,
  artifact: FileStack,
  influence: Users,
  identity: UserRound,
  entity: Sparkles,
};

type Props = {
  kind: CitationSourceKind;
  className?: string;
  iconClassName?: string;
};

export function CitationSourceIcon({ kind, className, iconClassName }: Props) {
  if (kind === "general") {
    return <OpenAiMark size="xs" className={cn("opacity-80", iconClassName, className)} />;
  }

  const Icon = ICONS[kind] ?? FileStack;
  return <Icon className={cn("h-2.5 w-2.5", iconClassName, className)} strokeWidth={2.25} aria-hidden />;
}
