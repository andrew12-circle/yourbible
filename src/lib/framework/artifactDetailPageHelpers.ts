import { cleanTranscriptQuoteForDisplay } from "@/lib/normalizePastedTranscript";
import {
  formatEpistemologyMarkdownSections,
  parseClaimEpistemology,
  type ClaimEpistemology,
} from "@/lib/framework/epistemology";
import { formatClaimSourceClock, type TranscriptSegment } from "@/lib/transcriptSplit";
import { claimResearchChatTitle } from "@/lib/myai/chatTitle";
import { resolveFindingSource } from "@/lib/framework/claimEvidence";

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
export type ArtifactDetailClaimSource = {
  id: string; claim: string; tone: string | null; doctrine_tags: string[];
  scripture_supports: { ref: string; note?: string }[];
  scripture_challenges: { ref: string; note?: string }[];
  match_relation: string | null; matched_belief_id: string | null; bias_flags: string[];
  verdict: string | null; epistemology?: ClaimEpistemology | null;
  source_evidence?: unknown;
};
/** Legacy claims without evidence remain unverified; related keywords are not a source citation. */
export function findClaimSource(claim: ArtifactDetailClaimSource, segments: TranscriptSegment[]): TranscriptSegment | null {
  return resolveFindingSource(claim.source_evidence, segments);
}
export type ArtifactDetailMatchedBelief = {
  id: string; topic: string; statement: string; answer: string | null; confidence: number;
};
export function buildClaimResearchMarkdown(
  artifactTitle: string | null,
  claim: ArtifactDetailClaimSource,
  source: TranscriptSegment | null | undefined,
  belief: ArtifactDetailMatchedBelief | undefined,
): string {
  const lines: string[] = ["## Artifact claim research", ""];
  if (artifactTitle?.trim()) lines.push(`**Artifact:** ${artifactTitle.trim()}`, "");
  lines.push("## Source claim (AI-extracted; not a verdict)", claim.claim.trim(), "");
  if (claim.verdict) lines.push("## My verdict (so far)", `- **${claim.verdict}**`, "");
  if (claim.tone?.trim()) lines.push("## AI tone interpretation", claim.tone.trim(), "");
  if (claim.doctrine_tags?.length) {
    lines.push("## Tags");
    for (const t of claim.doctrine_tags) lines.push(`- ${t}`);
    lines.push("");
  }
  if (claim.match_relation) {
    lines.push("## AI comparison with your framework");
    lines.push(claim.source_evidence && !belief ? "Not compared yet" :
      claim.match_relation === "new" ? "No matching belief was identified" : `Suggested relation: ${claim.match_relation}`);
    lines.push("");
  }
  if (claim.bias_flags?.length) {
    lines.push("## AI flags to examine");
    for (const f of claim.bias_flags) lines.push(`- ${f}`);
    lines.push("");
  }
  lines.push("## Source in transcript");
  if (source?.text?.trim()) {
    const clock = formatClaimSourceClock(source.startSeconds, source.label);
    const quote = cleanTranscriptQuoteForDisplay(source.text);
    if (clock) lines.push(`**[${clock}]${source.timestampEstimated ? " — approximate timing" : ""}**`);
    lines.push("> " + (quote || source.text.trim()).replace(/\n/g, "\n> "));
    lines.push("", "_The quote matches the transcript. This does not verify the claim's truth or the speaker's intent._");
  } else lines.push("_Source not verified. No transcript quotation or exact timestamp has been inferred._");
  lines.push("");
  if (belief) {
    lines.push("## Your belief context", `**Statement:** ${belief.statement}`);
    if (belief.answer?.trim()) lines.push("", belief.answer.trim());
    lines.push("", `- Confidence: ${belief.confidence}%`, "");
  }
  const sup = claim.scripture_supports ?? [];
  const chal = claim.scripture_challenges ?? [];
  if (sup.length || chal.length) {
    lines.push("## AI-suggested Scripture for examination");
    if (sup.length) {
      lines.push("### Possible support");
      for (const s of sup) lines.push(`- **${s.ref}**${s.note ? ` — ${s.note}` : ""}`);
      lines.push("");
    }
    if (chal.length) {
      lines.push("### Possible challenges or qualifications");
      for (const s of chal) lines.push(`- **${s.ref}**${s.note ? ` — ${s.note}` : ""}`);
      lines.push("");
    }
  }
  const epistemology = parseClaimEpistemology(claim.epistemology);
  if (epistemology) lines.push(...formatEpistemologyMarkdownSections(epistemology));
  lines.push("---", "", "_Add your notes below._", "");
  return lines.join("\n");
}
export function buildClaimResearchJournalTitle(
  _artifactTitle: string | null, claim: Pick<ArtifactDetailClaimSource, "claim">,
): string {
  return claimResearchChatTitle(claim.claim);
}
