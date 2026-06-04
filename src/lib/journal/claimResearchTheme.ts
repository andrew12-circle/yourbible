/** Gemini web UI — minimal chrome, single soft glow, pill input. */

/** Centered cyan wash behind the composer (matches gemini.google.com). */
export const claimResearchAmbient =
  "relative isolate before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:content-[''] " +
  "before:bg-[radial-gradient(ellipse_70%_55%_at_50%_100%,rgba(168,199,255,0.35),transparent_65%)] " +
  "dark:before:bg-[radial-gradient(ellipse_70%_55%_at_50%_100%,rgba(66,133,244,0.18),transparent_65%)]";

export const claimResearchColumn = "mx-auto w-full max-w-3xl";

export const geminiSparkleIcon =
  "bg-gradient-to-br from-[#4285F4] via-[#9B72CB] via-40% to-[#EA4335] text-white";

/** User turn — subtle pill, not a loud gradient bubble. */
export const geminiUserTurn =
  "max-w-[min(100%,85%)] whitespace-pre-wrap rounded-[24px] bg-muted/50 px-4 py-2.5 text-[15px] leading-relaxed text-foreground " +
  "dark:bg-muted/30";

/** Bottom “Ask Gemini” pill. */
export const geminiInputShell =
  "flex min-h-[52px] items-end gap-1 rounded-[28px] border border-border/60 bg-card px-2 py-1.5 " +
  "shadow-[0_1px_3px_rgba(60,64,67,0.08),0_4px_16px_rgba(60,64,67,0.06)] " +
  "dark:border-border/50 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]";

export const geminiChip =
  "shrink-0 rounded-full border-0 bg-muted/40 px-3.5 py-2 text-[13px] font-normal text-muted-foreground " +
  "transition-colors hover:bg-muted/70 hover:text-foreground disabled:opacity-50";

export const geminiSendButton =
  "h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground " +
  "data-[active=true]:bg-[#4285F4] data-[active=true]:text-white data-[active=true]:hover:bg-[#1a73e8] disabled:opacity-35";
