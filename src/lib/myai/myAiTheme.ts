/** My AI composer — ChatGPT-inspired neutral shell. */
export const myAiInputShell =
  "flex flex-col rounded-[24px] border border-border/80 bg-background px-2 pt-2 pb-1.5 " +
  "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)] " +
  "dark:border-border/60 dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)]";

export const myAiComposerColumn = "mx-auto w-full max-w-2xl";

/** Warm glow anchored to the center of the Ask anything composer shell. */
export const myAiWelcomeGlowShell =
  "pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2";

export const myAiWelcomeGlowOrb =
  "h-[min(300px,38vh)] w-[min(480px,92vw)] shrink-0 rounded-full " +
  "bg-[radial-gradient(ellipse_at_center,hsl(43_96%_78%_/_0.50)_0%,hsl(45_88%_84%_/_0.28)_32%,hsl(45_85%_88%_/_0.10)_52%,transparent_72%)] " +
  "blur-[0.5px] " +
  "dark:bg-[radial-gradient(ellipse_at_center,hsl(43_75%_58%_/_0.30)_0%,hsl(45_65%_48%_/_0.16)_35%,transparent_72%)]";

export const myAiChatTitle = "truncate text-sm font-semibold tracking-tight text-foreground";

export const myAiComposerPill =
  "inline-flex items-center gap-1 rounded-full bg-muted/80 px-3 py-1 text-xs font-medium " +
  "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export const myAiComposerPillActive =
  "inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium " +
  "text-blue-700 transition-colors hover:bg-blue-500/15 dark:text-blue-300";

/** User message bubble — dark blue text on light blue wash. */
export const myAiUserBubble =
  "rounded-2xl bg-blue-500/10 px-3.5 py-2.5 text-sm leading-relaxed text-blue-800 " +
  "ring-1 ring-blue-500/15 dark:bg-blue-500/15 dark:text-blue-200";

export const myAiSidebarSectionGap = "mb-4 pt-1";

/** Day One–style system stack for the Lumen chat list sidebar. */
export const myAiSidebarFont = "font-system tracking-tight";

export const myAiSidebarBrandTitle =
  "truncate text-[1.875rem] font-semibold leading-none tracking-tight text-foreground";

export const myAiSidebarSectionHeader =
  "truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground";

export const myAiSidebarSectionCount =
  "shrink-0 text-[11px] font-semibold tabular-nums tracking-normal text-red-500";

export const myAiSidebarGroupHeader =
  "truncate text-[13px] font-semibold tracking-tight text-foreground";

export const myAiSidebarChatRow =
  "text-[14px] font-semibold leading-snug tracking-tight";

export const myAiSidebarChatRowMuted =
  "text-[14px] font-medium leading-snug tracking-tight text-muted-foreground";
