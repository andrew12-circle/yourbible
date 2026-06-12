export type FontChoiceId = "serif" | "sans" | "sf";

export const LS_FONT_CHOICE_KEY = "yb.fontChoice";

export type FontChoice = {
  id: FontChoiceId;
  label: string;
  sample: string;
  /** Tailwind class for preview typography */
  previewClass: string;
};

export const FONT_CHOICES: FontChoice[] = [
  { id: "serif", label: "Serif", sample: "Cormorant Garamond", previewClass: "font-scripture" },
  { id: "sans", label: "Sans", sample: "Inter", previewClass: "font-sans" },
  { id: "sf", label: "San Francisco", sample: "SF Pro", previewClass: "font-system" },
];

export const SCRIPTURE_FONT_STACKS: Record<FontChoiceId, string> = {
  serif: "'Cormorant Garamond', 'Crimson Pro', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
  sf: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
};

/** Ethiopic script stack for Amharic / Ge'ez Bible text. */
export const ETHIOPIC_SCRIPTURE_FONT =
  "'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif";

export function normalizeFontChoice(raw: string | undefined | null): FontChoiceId {
  if (raw === "sans" || raw === "sf") return raw;
  return "serif";
}

export function scriptureFontFamily(choice: string | undefined | null): string {
  return SCRIPTURE_FONT_STACKS[normalizeFontChoice(choice)];
}

/** Size/leading shared by all reader font choices. */
export const READER_SCRIPTURE_SIZE = "text-[14px] sm:text-[14.5px] leading-[1.72]";

/** Shared reader typography utilities (matches live page + paginator). */
export const READER_SCRIPTURE_TYPO_BASE = `${READER_SCRIPTURE_SIZE} ink-text`;

export function pageTypoClass(choice: string | undefined | null): string {
  const id = normalizeFontChoice(choice);
  if (id === "sans") return `font-sans ${READER_SCRIPTURE_TYPO_BASE}`;
  if (id === "sf") return `font-system reader-sf-body ${READER_SCRIPTURE_SIZE}`;
  return `font-scripture ${READER_SCRIPTURE_TYPO_BASE}`;
}

export function readerScriptureTypographyStyle(
  choice: string | undefined | null,
  fontScale: number,
): { fontSize: string; fontFamily: string } {
  return {
    fontSize: `${fontScale}em`,
    fontFamily: scriptureFontFamily(choice),
  };
}

export function fontChoiceLabel(id: string | undefined): string {
  return FONT_CHOICES.find((f) => f.id === id)?.label ?? "Serif";
}
