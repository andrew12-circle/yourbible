import { resolveFindingEvidence, type ArtifactFindingEvidence } from "@/lib/framework/artifactFindingEvidence";
import { cleanTranscriptQuoteForDisplay } from "@/lib/normalizePastedTranscript";
import { formatEpistemologyMarkdownSections, parseClaimEpistemology, type ClaimEpistemology } from "@/lib/framework/epistemology";
import { formatClaimSourceClock, type TranscriptSegment } from "@/lib/transcriptSplit";
import { claimResearchChatTitle } from "@/lib/myai/chatTitle";

export function formatArtifactKind(kind: string): string {
  if (kind === "youtube") return "YouTube";
  return kind.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
export function formatArtifactStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
export function titleLooksBad(title: string | null | undefined): boolean {
  if (!title?.trim()) return true;
  const t = title.trim();
  return (t.length <= 5 && /^\d+(?:\.\d+)?[KMB]?$/i.test(t)) || /^\d+(?:\.\d+)?[KMB]?\s+(views?|subscribers?)\b/i.test(t);
}
export function withYouTubeTimestamp(url: string | null | undefined, seconds: number) {
  if (!url) return "";
  try {
    const parsed = new URL(url); parsed.searchParams.set("t", `${Math.max(0, Math.floor(seconds))}s`); return parsed.toString();
  } catch { return `${url}${url.includes("?") ? "&" : "?"}t=${Math.max(0, Math.floor(seconds))}s`; }
}
export type ArtifactDetailClaimSource = ArtifactFindingEvidence & {
  id: string; claim: string; tone: string | null; doctrine_tags: string[];
  scripture_supports: { ref: string; note?: string }[]; scripture_challenges: { ref: string; note?: string }[];
  match_relation: string | null; matched_belief_id: string | null; bias_flags: string[];
  verdict: string | null; epistemology?: ClaimEpistemology | null;
};
export function findClaimSource(claim: ArtifactDetailClaimSource, segments: TranscriptSegment[]) {
  return resolveFindingEvidence(claim, segments);
}
export type ArtifactDetailMatchedBelief = { id: string; topic: string; statement: string; answer: string | null; confidence: number };

export function buildClaimResearchMarkdown(artifactTitle: string | null, claim: ArtifactDetailClaimSource,
  source: TranscriptSegment | null | undefined, belief: ArtifactDetailMatchedBelief | undefined): string {
  const lines: string[] = ["## Artifact claim research", ""];
  if (artifactTitle?.trim()) lines.push(`**Artifact:** ${artifactTitle.trim()}`, "");
  lines.push("## Claim", claim.claim.trim(), "");
  if (claim.verdict) lines.push("## Verdict (so far)", `- **${claim.verdict}**`, "");
  if (claim.tone?.trim()) lines.push("## Tone", claim.tone.trim(), "");
  if (claim.doctrine_tags?.length) lines.push("## Tags", ...claim.doctrine_tags.map(t => `- ${t}`), "");
  if (claim.match_relation) lines.push("## Relation to your framework", claim.match_relation === "new"
    ? "No clear match in the compared belief context" : `Compared belief: ${claim.match_relation}`, "");
  if (claim.bias_flags?.length) lines.push("## Flags", ...claim.bias_flags.map(f => `- ${f}`), "");
  if (claim.importance_reason) lines.push("## Why selected", claim.importance_reason, "");
  lines.push("## Source in transcript");
  if (source?.text?.trim()) {
    const clock = formatClaimSourceClock(source.startSeconds, source.label);
    const quote = cleanTranscriptQuoteForDisplay(source.text);
    if (clock) lines.push(`**[${source.timestampEstimated ? "Approx. " : ""}${clock}]**`);
    lines.push("> " + (quote || source.text.trim()).replace(/\n/g, "\n> "));
  } else lines.push("_No verified transcript source. Do not treat a keyword match as evidence._");
  lines.push("");
  if (belief) {
    lines.push("## Your belief context", `**Statement:** ${belief.statement}`);
    if (belief.answer?.trim()) lines.push("", belief.answer.trim());
    lines.push("", `- Confidence: ${belief.confidence}%`, "");
  }
  const sup = claim.scripture_supports ?? [];
  const chal = claim.scripture_challenges ?? [];
  if (sup.length || chal.length) {
    lines.push("## Scripture");
    if (sup.length) { lines.push("### Supports"); for (const s of sup) lines.push(`- **${s.ref}**${s.note ? ` — ${s.note}` : ""}`); lines.push(""); }
    if (chal.length) { lines.push("### Challenges"); for (const s of chal) lines.push(`- **${s.ref}**${s.note ? ` — ${s.note}` : ""}`); lines.push(""); }
  }
  const epistemology = parseClaimEpistemology(claim.epistemology);
  if (epistemology) lines.push(...formatEpistemologyMarkdownSections(epistemology));
  lines.push("---", "", "_Add your notes below._", "");
  return lines.join("\n");
}
export function buildClaimResearchJournalTitle(_artifactTitle: string | null, claim: Pick<ArtifactDetailClaimSource, "claim">): string {
  return claimResearchChatTitle(claim.claim);
}
