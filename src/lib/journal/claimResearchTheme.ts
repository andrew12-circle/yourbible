/** Gemini web UI — minimal chrome, single soft glow, pill input. */

/** Centered cyan wash behind the composer (matches gemini.google.com). */
export const claimResearchAmbient =
  "relative isolate before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:content-[''] " +
  "before:bg-[radial-gradient(ellipse_70%_55%_at_50%_100%,rgba(168,199,255,0.35),transparent_65%)] " +
  "dark:before:bg-[radial-gradient(ellipse_70%_55%_at_50%_100%,rgba(66,133,244,0.18),transparent_65%)]";

export const claimResearchColumn = "mx-auto w-full max-w-3xl";

export const geminiSparkleIcon =
  "bg-gradient-to-br from-[#4285F4] via-[#9B72CB] via-40% to-[#EA4335] text-white";

/** User turn — rounded rectangle that grows with content. */
export const geminiUserTurn =
  "w-fit max-w-[min(100%,85%)] whitespace-pre-wrap break-words rounded-xl bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-foreground " +
  "dark:bg-muted/30";

/** Gemini multi-line composer: textarea grows on top, toolbar row below. */
export const geminiInputShell =
  "flex flex-col rounded-[28px] border border-[#dde3ea] bg-[#f0f4f9] px-1.5 pt-1.5 pb-1 " +
  "shadow-[0_1px_3px_rgba(60,64,67,0.08),0_4px_16px_rgba(60,64,67,0.06)] " +
  "dark:border-border/50 dark:bg-muted/30 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]";

