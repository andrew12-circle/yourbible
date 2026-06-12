const DEFAULT_LABELS: Record<string, string> = {
  belief: "Belief",
  journal: "Journal entry",
  artifact: "Artifact",
  entity: "Entity",
  identity: "Identity",
  general: "Outside knowledge (OpenAI)",
  influence: "Influence",
};

const MAX_CHIP_LABEL = 56;

/** Short, scannable citation chip text — never dump journal excerpts into the UI. */
export function formatCitationLabel(c: {
  source_type: string;
  label: string;
  id?: string;
}): string {
  const custom = c.label?.trim() ?? "";
  const fallback = DEFAULT_LABELS[c.source_type] ?? "Source";

  if (!custom) return fallback;

  const looksLikeDump =
    custom.length > MAX_CHIP_LABEL ||
    /what i have learned|---\s*(?:ai|you)\s*:/i.test(custom);

  if (c.id && looksLikeDump) return fallback;

  if (custom.length <= MAX_CHIP_LABEL) return custom;

  return `${custom.slice(0, MAX_CHIP_LABEL - 1).trim()}…`;
}
