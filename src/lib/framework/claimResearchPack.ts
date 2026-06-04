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

const EPISTEMIC_LABELS: Record<string, string> = {
  scripture_text: "From fetched Bible text",
  training_only: "Model training data (not verified)",
  web_snippet: "Web snippets (not vetted)",
  mixed: "Mixed sources",
  unknown: "Limited passage data",
};

/** Turn bible-passage / API.Bible error blobs into a short human-readable line. */
export function formatPassageFetchError(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Could not load this passage.";

  if (/could not find that passage/i.test(trimmed)) {
    return "Not available in your selected Bible translation.";
  }

  const nestedMessage = trimmed.match(/"message":"((?:\\.|[^"\\])*)"/);
  if (nestedMessage?.[1]) {
    return nestedMessage[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
  }

  const escapedMessage = trimmed.match(/\\"message\\":\\"((?:\\.|[^"\\])*)\\"/);
  if (escapedMessage?.[1]) {
    return escapedMessage[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
  }

  if (/could not parse/i.test(trimmed)) {
    return trimmed.replace(/^[^:]+:\s*/i, "").trim() || "Could not parse this reference.";
  }

  if (/bible-passage\s+404/i.test(trimmed) || /API\.Bible:\s*404/i.test(trimmed)) {
    return "Not available in your selected Bible translation.";
  }

  if (/bible-passage\s+(\d{3})/i.test(trimmed)) {
    const status = trimmed.match(/bible-passage\s+(\d{3})/i)?.[1];
    if (status === "401" || status === "403") return "Bible API access denied — check your API key.";
    if (status === "502" || status === "503") return "Bible service temporarily unavailable.";
  }

  const withoutJson = trimmed.replace(/\{[\s\S]*\}/g, "").replace(/\s+/g, " ").trim();
  if (withoutJson.length > 0 && withoutJson.length <= 160) {
    return withoutJson.replace(/:\s*$/, "").replace(/^bible-passage\s+\d{3}\s*:?\s*/i, "").trim();
  }

  return "Could not load this passage.";
}

export function epistemicLabel(epistemic: string): string {
  return EPISTEMIC_LABELS[epistemic] ?? epistemic.replace(/_/g, " ");
}

/** Strip model-injected epistemic header lines (shown as UI badge instead). */
export function sanitizeResearchSectionBody(body: string): string {
  let text = body.trim();
  text = text.replace(/^Epistemic:\s*[\w.]+\s*(\n+|$)/i, "");
  text = text.replace(/^Epistemic:\s*[\w.]+\s*\.?\s*/i, "");
  return text.trim();
}

/** Match assistant chat bubbles in claim research UI. */
export const researchPackAssistantProse = [
  "prose prose-xs max-w-none break-words dark:prose-invert text-foreground",
  "prose-p:my-2 prose-p:text-xs prose-p:leading-relaxed",
  "prose-li:my-1 prose-li:text-xs prose-li:leading-relaxed",
  "prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-xs prose-headings:font-semibold",
  "prose-strong:font-semibold prose-strong:text-foreground",
  "prose-blockquote:my-2 prose-blockquote:border-l-2 prose-blockquote:border-primary/30",
  "prose-blockquote:pl-3 prose-blockquote:text-xs prose-blockquote:leading-relaxed prose-blockquote:not-italic",
  "prose-blockquote:text-muted-foreground",
].join(" ");

export function formatVoicesAsMarkdown(voices: IndependentVoice[]): string {
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
      `**${i + 1}. ${v.name}** · ${v.tradition_or_role}`,
      `_${v.angle} · ${agree}_`,
      "",
      v.summary,
      v.source_url ? `\n[Source](${v.source_url})` : "",
      "",
    );
  });
  return lines.join("\n").trimEnd();
}

export function formatPassagesAsMarkdown(
  loaded: { ref: string; reference?: string; text: string }[],
): string {
  const blocks: string[] = [];
  for (const row of loaded) {
    blocks.push(`**${row.ref}**${row.reference ? ` · ${row.reference}` : ""}`, "", `> ${row.text.replace(/\n/g, "\n> ")}`, "");
  }
  return blocks.join("\n").trimEnd();
}

export function getResearchPackLensOrder(data: ResearchPackResp): string[] {
  const packType = data.pack_type ?? data.meta?.pack_type ?? "standard";
  const isValidation = packType === "validation";
  return (data.meta?.lenses?.length
    ? data.meta.lenses
    : isValidation
      ? [...VALIDATION_LENS_ORDER]
      : [...STANDARD_LENS_ORDER]) as string[];
}

export function getResearchPackLensLabel(lensId: string, data: ResearchPackResp): string {
  const isValidation = (data.pack_type ?? data.meta?.pack_type) === "validation";
  const labels = isValidation ? VALIDATION_LENS_LABELS : STANDARD_LENS_LABELS;
  return labels[lensId] ?? lensId;
}

export function partitionScriptureEntries(
  scripture: ResearchPackResp["scripture"],
): {
  loaded: { ref: string; reference?: string; text: string }[];
  failed: { ref: string; message: string }[];
} {
  const loaded: { ref: string; reference?: string; text: string }[] = [];
  const failed: { ref: string; message: string }[] = [];
  for (const row of scripture ?? []) {
    if (row.error) {
      failed.push({ ref: row.ref, message: formatPassageFetchError(row.error) });
      continue;
    }
    const text = row.text?.trim();
    if (text) loaded.push({ ref: row.ref, reference: row.reference, text });
  }
  return { loaded, failed };
}

export function extraReferenceParseErrors(
  meta: ResearchPackResp["meta"],
  failedRefs: Set<string>,
): { ref: string; message: string }[] {
  const out: { ref: string; message: string }[] = [];
  for (const e of meta?.ref_parse_errors ?? []) {
    if (failedRefs.has(e.ref)) continue;
    out.push({ ref: e.ref, message: formatPassageFetchError(e.error) });
  }
  return out;
}

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
  const { loaded, failed } = partitionScriptureEntries(data.scripture);
  const failedRefs = new Set(failed.map((f) => f.ref));
  const extraFailed = extraReferenceParseErrors(meta, failedRefs);

  if (loaded.length) {
    lines.push("## Bible passages", "");
    for (const row of loaded) {
      lines.push(
        `- **${row.ref}**${row.reference ? ` (${row.reference})` : ""}`,
        "",
        "```text",
        row.text,
        "```",
        "",
      );
    }
  }
  const allFailed = [...failed, ...extraFailed];
  if (allFailed.length) {
    lines.push("## Passages we could not load", "");
    for (const row of allFailed) {
      lines.push(`- **${row.ref}** — ${row.message}`);
    }
    lines.push("");
  }
  const order = getResearchPackLensOrder(data);
  for (const id of order) {
    const s = data.sections[id];
    if (!s) continue;
    const title = getResearchPackLensLabel(id, data);
    lines.push(
      `## ${title}`,
      "",
      `*Source: ${epistemicLabel(s.epistemic)}*`,
      "",
      sanitizeResearchSectionBody(s.body),
    );
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
