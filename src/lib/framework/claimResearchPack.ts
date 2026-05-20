export type ResearchPackSection = {
  body: string;
  epistemic: string;
  voices?: IndependentVoice[];
};

export type IndependentVoice = {
  name: string;
  tradition_or_role: string;
  angle: string;
  summary: string;
  agreement: "agrees" | "qualifies" | "disagrees" | "unclear";
  source_url?: string;
  epistemic: "web_snippet" | "training_only";
};

export type ResearchPackResp = {
  pack_type?: "standard" | "validation";
  sections: Record<string, ResearchPackSection>;
  independent_voices?: IndependentVoice[] | null;
  scripture?: { ref: string; reference?: string; text?: string; error?: string }[];
  meta?: {
    bible_id?: string;
    used_web?: boolean;
    web_provider?: string | null;
    lenses?: string[];
    pack_type?: string;
    user_question?: string | null;
    ref_parse_errors?: { ref: string; error: string }[];
  };
  error?: string;
};

const STANDARD_LENS_ORDER = [
  "scripture_context",
  "historical_theology",
  "opposing_views",
  "denominational_notes",
  "logical_audit",
  "scientific_relevance",
  "synthesis",
] as const;

const VALIDATION_LENS_ORDER = [
  "bible_alignment",
  "historical_context",
  "independent_voices",
] as const;

const STANDARD_LENS_LABELS: Record<string, string> = {
  scripture_context: "Scripture context",
  historical_theology: "Historical theology",
  opposing_views: "Opposing views",
  denominational_notes: "Denominational notes",
  logical_audit: "Logical audit",
  scientific_relevance: "Scientific relevance",
  synthesis: "Synthesis",
};

const VALIDATION_LENS_LABELS: Record<string, string> = {
  bible_alignment: "Bible alignment",
  historical_context: "Historical context",
  independent_voices: "Three independent voices",
};

export const CLAIM_RESEARCH_PROMPT_CHIPS = [
  {
    label: "Find 3 teachers who agree/disagree",
    text: "Find three independent teachers or theologians who agree, qualify, or disagree with this claim — different angles, named clearly.",
  },
  {
    label: "How does this compare to Scripture?",
    text: "How does this claim align or tension with Scripture? Cite relevant passages and note where the claim overreaches or fits.",
  },
  {
    label: "Historical context",
    text: "What historical and church-historical context should I know for this claim?",
  },
] as const;

function formatVoicesMarkdown(voices: IndependentVoice[]): string {
  const lines: string[] = [];
  voices.slice(0, 3).forEach((v, i) => {
    const agree =
      v.agreement === "agrees"
        ? "Agrees"
        : v.agreement === "disagrees"
          ? "Disagrees"
          : v.agreement === "qualifies"
            ? "Qualifies"
            : "Unclear";
    lines.push(
      `### Voice ${i + 1}: ${v.name}`,
      `*${v.tradition_or_role} · ${v.angle} · ${agree} · epistemic: ${v.epistemic}*`,
      "",
      v.summary,
      v.source_url ? `\n[Source](${v.source_url})` : "",
      "",
    );
  });
  return lines.join("\n").trimEnd();
}

export function formatResearchPackMarkdown(data: ResearchPackResp): string {
  const packType = data.pack_type ?? data.meta?.pack_type ?? "standard";
  const isValidation = packType === "validation";
  const lines: string[] = [
    isValidation ? "# Multi-source validation" : "# Claim research pack",
    "",
  ];
  const meta = data.meta;
  if (meta) {
    const webNote = meta.used_web
      ? `live web snippets via ${meta.web_provider ?? "?"} (not vetted)`
      : "no live web search — training-data / fetched scripture only";
    lines.push(`_${webNote} · Bible id: ${meta.bible_id ?? "—"}_`, "");
  }
  const scr = data.scripture;
  if (scr?.length) {
    lines.push("## Passages fetched", "");
    for (const row of scr) {
      if (row.error) lines.push(`- **${row.ref}**: _${row.error}_`);
      else {
        lines.push(
          `- **${row.ref}**${row.reference ? ` (${row.reference})` : ""}`,
          "",
          "```text",
          row.text ?? "",
          "```",
          "",
        );
      }
    }
  }
  const errs = meta?.ref_parse_errors;
  if (errs?.length) {
    lines.push("## Reference notes", "");
    for (const e of errs) lines.push(`- **${e.ref}**: ${e.error}`);
    lines.push("");
  }
  const order = (meta?.lenses?.length
    ? meta.lenses
    : isValidation
      ? [...VALIDATION_LENS_ORDER]
      : [...STANDARD_LENS_ORDER]) as string[];
  const labels = isValidation ? VALIDATION_LENS_LABELS : STANDARD_LENS_LABELS;
  for (const id of order) {
    const s = data.sections[id];
    if (!s) continue;
    const title = labels[id] ?? id;
    lines.push(`## ${title}`, "", `*Epistemic: ${s.epistemic}*`, "", s.body.trim());
    const voices = s.voices ?? (id === "independent_voices" ? data.independent_voices : null);
    if (voices?.length) {
      lines.push("", formatVoicesMarkdown(voices));
    }
    lines.push("", "---", "");
  }
  return lines.join("\n").trimEnd();
}

export function webSearchStatusLabel(meta?: ResearchPackResp["meta"]): string {
  if (!meta) return "Web search status unknown.";
  if (meta.used_web) {
    return `Live web search ran (${meta.web_provider ?? "provider"}). Snippets are not vetted — verify names and links yourself.`;
  }
  return "No live web search for this run. Voices and historical notes come from the model's training data unless scripture was fetched from your Bible API.";
}
