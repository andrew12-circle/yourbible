import type { ReactNode } from "react";
import {
  CheckSquare,
  Heading1,
  Lightbulb,
  Link2,
  ListIcon,
  ListOrdered,
  Quote,
  Sparkles,
  TableIcon,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JournalPrivacyBlurToolbarButton } from "@/components/journal/JournalPrivacyBlurToggle";
import { AiWritingAssistToolbarButton } from "@/components/writing/AiWritingAssistToggle";

type ToolItem = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function ToolGrid({ items }: { items: ToolItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={item.disabled}
          onClick={item.onClick}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-muted/20 px-2 py-3 text-[11px] font-medium transition",
            item.disabled
              ? "text-muted-foreground/40"
              : "text-foreground hover:bg-muted/40 active:bg-muted/55",
          )}
        >
          {item.icon}
          <span className="text-center leading-tight">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

type Props = {
  onPrompts: () => void;
  onInsert: (before: string, after?: string, placeholder?: string) => void;
  onTags: () => void;
  onScore?: () => void;
  scoring?: boolean;
  scoreDisabled?: boolean;
  formattingDisabled?: boolean;
};

export default function MobileJournalMoreTools({
  onPrompts,
  onInsert,
  onTags,
  onScore,
  scoring = false,
  scoreDisabled = false,
  formattingDisabled = false,
}: Props) {
  const formatTools: ToolItem[] = [
    {
      icon: <Heading1 className="h-5 w-5" />,
      label: "Heading",
      disabled: formattingDisabled,
      onClick: () => onInsert("\n# ", "", "Heading"),
    },
    {
      icon: <ListIcon className="h-5 w-5" />,
      label: "Bullets",
      disabled: formattingDisabled,
      onClick: () => onInsert("\n- ", "", "item"),
    },
    {
      icon: <ListOrdered className="h-5 w-5" />,
      label: "Numbered",
      disabled: formattingDisabled,
      onClick: () => onInsert("\n1. ", "", "item"),
    },
    {
      icon: <CheckSquare className="h-5 w-5" />,
      label: "Checklist",
      disabled: formattingDisabled,
      onClick: () => onInsert("\n- [ ] ", "", "task"),
    },
    {
      icon: <Quote className="h-5 w-5" />,
      label: "Quote",
      disabled: formattingDisabled,
      onClick: () => onInsert("\n> ", "", "quote"),
    },
    {
      icon: <Link2 className="h-5 w-5" />,
      label: "Link",
      disabled: formattingDisabled,
      onClick: () => onInsert("[[", "]]", "title"),
    },
    {
      icon: <TableIcon className="h-5 w-5" />,
      label: "Table",
      disabled: formattingDisabled,
      onClick: () => onInsert("\n| col1 | col2 |\n| --- | --- |\n| ", " | |\n", ""),
    },
    {
      icon: <Tag className="h-5 w-5" />,
      label: "Tags",
      onClick: onTags,
    },
    {
      icon: <Lightbulb className="h-5 w-5" />,
      label: "Prompts",
      onClick: onPrompts,
    },
    {
      icon: scoring ? <Sparkles className="h-5 w-5 animate-pulse" /> : <Sparkles className="h-5 w-5" />,
      label: scoring ? "Scoring…" : "AI score",
      disabled: scoreDisabled || scoring,
      onClick: () => onScore?.(),
    },
  ];

  return (
    <div className="space-y-4">
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Writing tools
        </p>
        <ToolGrid items={formatTools} />
      </section>
      <section className="rounded-lg border border-border bg-card p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assist</p>
        <div className="flex flex-wrap items-center gap-2">
          <AiWritingAssistToolbarButton className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border/60" />
          <JournalPrivacyBlurToolbarButton className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border/60" />
        </div>
      </section>
    </div>
  );
}
