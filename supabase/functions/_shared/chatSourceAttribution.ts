export type AnswerProvenance = "framework_only" | "framework_and_openai" | "web_openai";

export type CitationLike = {
  source_type: string;
  id?: string;
  label: string;
};

export function resolveAnswerProvenance(
  citations: CitationLike[],
  includeGeneral: boolean,
  usedWeb: boolean,
): AnswerProvenance {
  if (usedWeb) return "web_openai";
  const usedOutside = citations.some((c) => c.source_type === "general");
  if (!includeGeneral && !usedOutside) return "framework_only";
  if (usedOutside || includeGeneral) return "framework_and_openai";
  return "framework_only";
}

/** Persist how this answer was grounded — stored as a synthetic citation row. */
export function attachSourceAttribution<T extends CitationLike>(
  citations: T[],
  opts: { includeGeneral: boolean; usedWeb: boolean },
): T[] {
  const withoutMeta = citations.filter((c) => c.source_type !== "attribution");
  const provenance = resolveAnswerProvenance(withoutMeta, opts.includeGeneral, opts.usedWeb);
  const meta = { source_type: "attribution", label: provenance } as T;
  return [...withoutMeta, meta];
}
