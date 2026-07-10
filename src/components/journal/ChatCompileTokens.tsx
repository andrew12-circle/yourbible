import { NotebookPen } from "lucide-react";
import { ChatGptMark } from "@/components/myai/ChatGptMark";
import { YouTubeBrandMark } from "@/components/journal/YouTubeBrandMark";
import { cn } from "@/lib/utils";

const STACK_MS = 520;
const CYCLE_MS = 2400;

type MarkSize = "xs" | "sm";

function buildSources(markSize: MarkSize) {
  return [
    {
      id: "journal",
      label: "Journal",
      ring: "ring-amber-400/35",
      surface: "from-amber-50 via-amber-100/90 to-amber-200/70 border-amber-300/50",
      renderIcon: (className: string) => (
        <NotebookPen className={cn(className, "text-amber-900/75 dark:text-amber-100/85")} aria-hidden />
      ),
    },
    {
      id: "youtube",
      label: "YouTube",
      ring: "ring-red-400/30",
      surface: "from-red-50 via-white to-red-100/80 border-red-200/55",
      renderIcon: (className: string) => <YouTubeBrandMark size={markSize} className={className} />,
    },
    {
      id: "chatgpt",
      label: "ChatGPT",
      ring: "ring-emerald-400/35",
      surface: "from-emerald-50 via-white to-emerald-100/80 border-emerald-300/50",
      renderIcon: (className: string) => (
        <ChatGptMark size={markSize} className={cn(className, "text-[#10a37f]")} />
      ),
    },
  ] as const;
}

type Props = {
  /** Smaller tokens when trailing streamed text. */
  compact?: boolean;
  className?: string;
};

/** Overlapping source tokens — journal → YouTube → ChatGPT — while a reply compiles. */
export default function ChatCompileTokens({ compact = false, className }: Props) {
  const size = compact ? "h-7 w-7" : "h-9 w-9";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const markSize: MarkSize = compact ? "xs" : "sm";
  const overlapPx = compact ? 9 : 11;
  const sources = buildSources(markSize);

  return (
    <span
      role="status"
      aria-label="Searching your journal, YouTube teachings, and ChatGPT"
      className={cn("inline-flex items-center", compact ? "py-0.5" : "py-1", className)}
    >
      <span className="relative inline-flex items-center">
        {sources.map(({ id, label, ring, surface, renderIcon }, index) => {
          const enterDelayMs = index * STACK_MS;
          const thinkDelayMs = sources.length * STACK_MS + index * (CYCLE_MS / sources.length);

          return (
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
                ["--compile-enter-delay" as string]: `${enterDelayMs}ms`,
                ["--compile-think-delay" as string]: `${thinkDelayMs}ms`,
              }}
            >
              <span className="chat-compile-shimmer pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden>
                <span className="chat-compile-shimmer-sweep absolute inset-y-0 -left-full w-full" />
              </span>
              <span className="relative z-[1]">{renderIcon(iconSize)}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
