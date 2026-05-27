import {
  cleanTranscriptQuoteForDisplay,
} from "@/lib/normalizePastedTranscript";
import {
  formatClaimSourceClock,
  type TranscriptSegment,
} from "@/lib/transcriptSplit";

export function formatArtifactKind(kind: string): string {
  if (kind === "youtube") return "YouTube";
  return kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatArtifactStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function titleLooksBad(title: string | null | undefined): boolean {
  if (!title) return true;
  const t = title.trim();
  if (!t) return true;
  if (t.length <= 5 && /^\d+(?:\.\d+)?[KMB]?$/i.test(t)) return true;
  if (/^\d+(?:\.\d+)?[KMB]?\s+(views?|subscribers?)\b/i.test(t)) return true;
  return false;
}

export function withYouTubeTimestamp(url: string | null | undefined, seconds: number) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("t", `${Math.max(0, Math.floor(seconds))}s`);
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}t=${Math.max(0, Math.floor(seconds))}s`;
  }
}

const SOURCE_STOPWORDS = new Set([
  "about", "after", "again", "against", "also", "because", "before", "being", "between", "claim",
  "could", "every", "from", "have", "into", "just", "like", "lord", "more", "much", "must",
  "that", "their", "there", "these", "they", "this", "through", "what", "when", "where", "which",
  "while", "with", "would", "your",
]);

type ClaimSourceLike = {
  claim: string;
  doctrine_tags?: string[];
  scripture_supports?: { ref: string; note?: string }[];
  scripture_challenges?: { ref: string; note?: string }[];
};

function sourceTermsForClaim(claim: ClaimSourceLike) {
  const sourceText = [
    claim.claim,
    ...(claim.doctrine_tags ?? []),
    ...(claim.scripture_supports ?? []).flatMap((s) => [s.ref, s.note ?? ""]),
    ...(claim.scripture_challenges ?? []).flatMap((s) => [s.ref, s.note ?? ""]),
  ].join(" ");

  return Array.from(
    new Set(
      sourceText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((term) => term.length > 3 && !SOURCE_STOPWORDS.has(term)),
    ),
  );
}

export function findClaimSource(claim: ClaimSourceLike, segments: TranscriptSegment[]) {
  const terms = sourceTermsForClaim(claim);
  if (!terms.length) return null;

  let best: { segment: TranscriptSegment; score: number } | null = null;
  for (const segment of segments) {
    if (segment.isParagraphBreak || !segment.text.trim()) continue;
    const text = segment.text.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { segment, score };
  }

  if (!best || best.score < Math.min(2, terms.length)) return null;
  return best.segment;
}

export type MatchedBeliefLike = {
  statement: string;
  answer: string | null;
  confidence: number;
};

type ClaimResearchLike = ClaimSourceLike & {
  verdict?: string | null;
  tone?: string | null;
  match_relation?: string | null;
  bias_flags?: string[];
};

export function buildClaimResearchMarkdown(
  artifactTitle: string | null,
  claim: ClaimResearchLike,
  source: TranscriptSegment | null | undefined,
  belief: MatchedBeliefLike | undefined,
): string {
  const lines: string[] = [];
  lines.push("## Artifact claim research");
  lines.push("");
  if (artifactTitle?.trim()) {
    lines.push(`**Artifact:** ${artifactTitle.trim()}`);
    lines.push("");
  }
  lines.push("## Claim");
  lines.push(claim.claim.trim());
  lines.push("");
  if (claim.verdict) {
    lines.push("## Verdict (so far)");
    lines.push(`- **${claim.verdict}**`);
    lines.push("");
  }
  if (claim.tone?.trim()) {
    lines.push("## Tone");
    lines.push(claim.tone.trim());
    lines.push("");
  }
  if (claim.doctrine_tags?.length) {
    lines.push("## Tags");
    for (const t of claim.doctrine_tags) lines.push(`- ${t}`);
    lines.push("");
  }
  if (claim.match_relation) {
    lines.push("## Relation to your framework");
    lines.push(claim.match_relation === "new" ? "New to your framework" : `You ${claim.match_relation}`);
    lines.push("");
  }
  if (claim.bias_flags?.length) {
    lines.push("## Flags");
    for (const f of claim.bias_flags) lines.push(`- ${f}`);
    lines.push("");
  }
  lines.push("## Source in transcript");
  if (source?.text?.trim()) {
    const clock = formatClaimSourceClock(source.startSeconds, source.label);
    const quote = cleanTranscriptQuoteForDisplay(source.text);
    if (clock) lines.push(`**[${clock}]**`);
    lines.push("> " + (quote || source.text.trim()).replace(/\n/g, "\n> "));
  } else {
    lines.push("_No linked transcript snippet._");
  }
  lines.push("");
  if (belief) {
    lines.push("## Your belief context");
    lines.push(`**Statement:** ${belief.statement}`);
    if (belief.answer?.trim()) {
      lines.push("");
      lines.push(belief.answer.trim());
    }
    lines.push("");
    lines.push(`- Confidence: ${belief.confidence}%`);
    lines.push("");
  }
  const sup = claim.scripture_supports ?? [];
  const chal = claim.scripture_challenges ?? [];
  if (sup.length || chal.length) {
    lines.push("## Scripture");
    if (sup.length) {
      lines.push("### Supports");
      for (const s of sup) {
        lines.push(`- **${s.ref}**${s.note ? ` — ${s.note}` : ""}`);
      }
      lines.push("");
    }
    if (chal.length) {
      lines.push("### Challenges");
      for (const s of chal) {
        lines.push(`- **${s.ref}**${s.note ? ` — ${s.note}` : ""}`);
      }
      lines.push("");
    }
  }
  lines.push("---");
  lines.push("");
  lines.push("_Add your notes below._");
  lines.push("");
  return lines.join("\n");
}

export function buildClaimResearchJournalTitle(
  artifactTitle: string | null,
  claim: { claim: string },
): string {
  const clip = claim.claim.trim().slice(0, 70);
  const suffix = claim.claim.trim().length > 70 ? "…" : "";
  const base = artifactTitle?.trim() || "Artifact";
  return `Claim research: ${clip}${suffix} (${base})`;
}
