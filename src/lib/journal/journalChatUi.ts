/** User turn bubble — rounded rectangle that grows with content (not a stadium pill). */
export const journalChatUserBubbleClass =
  "w-fit max-w-[min(100%,85%)] rounded-xl bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-primary-foreground shadow-sm whitespace-pre-wrap break-words";

/** Journal entry title — display size; md: beats shadcn Input default md:text-sm on desktop. */
export const journalEntryTitleInputClass =
  "text-[32px] md:text-[36px] leading-tight font-display font-bold tracking-tight";

/** Borderless journal body — no rounded box chrome or focus corner artifacts. */
export const journalPlainWriteFieldClass =
  "journal-plain-write-field !block w-full !min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 shadow-none " +
  "rounded-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 " +
  "font-sans text-[16px] leading-relaxed [field-sizing:fixed]";

/** Citation / source chips under assistant replies. */
export const journalChatCitationChipBaseClass =
  "inline-flex max-w-full items-start rounded-lg border px-2.5 py-1 text-[11px] font-medium leading-snug tracking-tight";

export const journalChatCitationChipLinkedClass =
  "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10";

export const journalChatCitationChipMutedClass =
  "border-border bg-muted/50 text-muted-foreground";
