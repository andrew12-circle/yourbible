import { FileStack, NotebookPen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCES = [
  {
    id: "journal",
    Icon: NotebookPen,
    label: "Journal",
    ring: "ring-amber-400/35",
    iconClass: "text-amber-900/70 dark:text-amber-200/80",
    surface: "from-amber-50 via-amber-100/90 to-amber-200/70 border-amber-300/50",
    delay: "0ms",
  },
  {
    id: "artifacts",
    Icon: FileStack,
    label: "Artifacts",
    ring: "ring-blue-400/35",
    iconClass: "text-blue-900/70 dark:text-blue-200/80",
    surface: "from-sky-50 via-blue-100/90 to-blue-200/70 border-blue-300/50",
    delay: "800ms",
  },
  {
    id: "ai",
    Icon: Sparkles,
    label: "AI",
    ring: "ring-violet-400/35",
    iconClass: "text-violet-900/70 dark:text-violet-200/80",
    surface: "from-violet-50 via-violet-100/90 to-violet-200/70 border-violet-300/50",
    delay: "1600ms",
  },
] as const;

type Props = {
  /** Smaller tokens when trailing streamed text. */
  compact?: boolean;
  className?: string;
};

/** Overlapping source tokens — journal → artifacts → AI — while a reply compiles. */
export default function ChatCompileTokens({ compact = false, className }: Props) {
  const size = compact ? "h-7 w-7" : "h-9 w-9";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const overlapPx = compact ? 9 : 11;

  return (
    <span
      role="status"
      aria-label="Searching your journals, artifacts, and AI knowledge"
      className={cn("inline-flex items-center", compact ? "py-0.5" : "py-1", className)}
    >
      <span className="relative inline-flex items-center">
        {SOURCES.map(({ id, Icon, label, ring, iconClass, surface, delay }, index) => (
          <span
            key={id}
            title={label}
            className={cn(
              "chat-compile-token relative flex shrink-0 items-center justify-center rounded-full border bg-gradient-to-br shadow-sm ring-1 ring-inset",
              size,
              surface,
              ring,
            )}
            style={{
              marginLeft: index > 0 ? -overlapPx : 0,
              zIndex: index + 1,
              animationDelay: delay,
            }}
          >
            <span className="chat-compile-shimmer pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden>
              <span
                className="chat-compile-shimmer-sweep absolute inset-y-0 -left-full w-full"
                style={{ animationDelay: delay }}
              />
            </span>
            <Icon className={cn(iconSize, "relative z-[1]", iconClass)} aria-hidden />
          </span>
        ))}
      </span>
    </span>
  );
}
