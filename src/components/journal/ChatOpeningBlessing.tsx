import { CHAT_OPENING_BLESSING, CHAT_OPENING_BLESSING_LABEL } from "@/lib/myai/chatOpeningBlessing";
import { cn } from "@/lib/utils";

type Props = {
  /** Larger card on empty welcome screens; compact strip above the transcript. */
  variant?: "welcome" | "transcript";
  className?: string;
};

export default function ChatOpeningBlessing({ variant = "transcript", className }: Props) {
  const isWelcome = variant === "welcome";

  return (
    <div
      className={cn(
        "text-left",
        isWelcome ? "mx-auto w-full max-w-md" : "w-full",
        className,
      )}
      role="note"
      aria-label={CHAT_OPENING_BLESSING_LABEL}
    >
      <blockquote
        className={cn(
          "not-italic text-foreground/90",
          "rounded-r-lg border-l-[3px] border-red-600/45 bg-red-600/[0.06] ring-1 ring-red-600/15 dark:border-red-500/50 dark:bg-red-950/30 dark:ring-red-500/20",
          isWelcome ? "px-4 py-3.5 text-[13px] leading-[1.85]" : "px-3.5 py-3 text-[12px] leading-[1.8]",
        )}
      >
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-800/90 dark:text-red-400/95">
          {CHAT_OPENING_BLESSING_LABEL}
        </p>
        <p className="m-0">{CHAT_OPENING_BLESSING}</p>
      </blockquote>
    </div>
  );
}
