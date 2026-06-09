import { useNavigate } from "react-router-dom";
import { BookOpen, NotebookPen, Brain, FileStack } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeDashboardCounts } from "@/lib/home/homeApps";

interface HubStatusStripProps {
  counts: HomeDashboardCounts;
  className?: string;
}

export function HubStatusStrip({ counts, className }: HubStatusStripProps) {
  const navigate = useNavigate();

  const items = [
    {
      label: "Journal today",
      value: counts.journalToday,
      icon: NotebookPen,
      to: "/journal",
      accent: "text-violet-500",
    },
    {
      label: "Beliefs",
      value: counts.beliefs,
      icon: Brain,
      to: "/framework/beliefs",
      accent: "text-sky-500",
    },
    {
      label: "Artifacts",
      value: counts.artifacts,
      icon: FileStack,
      to: "/framework/artifacts",
      accent: "text-rose-500",
    },
    {
      label: "My AI chats",
      value: counts.chats,
      icon: BookOpen,
      to: "/my-ai",
      accent: "text-blue-500",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
        </span>
        <span className="text-xs font-medium text-foreground">Your day</span>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(item.to)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition"
          >
            <Icon className={cn("h-3.5 w-3.5", item.accent)} />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{item.label}</span>
            <span className="text-sm font-bold tabular-nums">{item.value}</span>
          </button>
        );
      })}
    </div>
  );
}
