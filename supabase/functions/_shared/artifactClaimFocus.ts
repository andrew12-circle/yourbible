import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

function verdictLabel(verdict: string | null | undefined): string {
  const v = (verdict ?? "").trim().toLowerCase();
  if (!v) return "not set — user has not approved, rejected, or deferred this claim yet";
  if (v === "keep") return "keep (user approved / incorporated)";
  if (v === "reject") return "reject (user disagrees)";
  if (v === "updated") return "updated (user revised their view)";
  if (v === "defer") return "defer (saved for later — no final verdict yet)";
  return v;
}

export type ArtifactClaimFocusPack = {
  claimFocusBlock: string;
  artifactId: string;
  claimId: string;
};

/** Build pinned session context for a single artifact claim + optional transcript excerpt. */
export async function buildArtifactClaimFocusPack(
  supabase: SupabaseClient,
  userId: string,
  claimId: string,
  transcriptExcerpt?: string | null,
): Promise<ArtifactClaimFocusPack | null> {
  const { data: claimRow, error: clErr } = await supabase
    .from("artifact_claims")
    .select(
      "id, artifact_id, claim, tone, doctrine_tags, bias_flags, scripture_supports, scripture_challenges, match_relation, matched_belief_id, user_id, verdict, deferred_at",
    )
    .eq("id", claimId)
    .maybeSingle();
  if (clErr || !claimRow || claimRow.user_id !== userId) return null;

  const artifactId = claimRow.artifact_id as string;
  const { data: artRow, error: artErr } = await supabase
    .from("artifacts")
    .select("id, title, kind, url, user_id")
    .eq("id", artifactId)
    .maybeSingle();
  if (artErr || !artRow || artRow.user_id !== userId) return null;

  let beliefBlock = "";
  const mb = typeof claimRow.matched_belief_id === "string" ? claimRow.matched_belief_id.trim() : "";
  if (mb && /^[0-9a-f-]{36}$/i.test(mb)) {
    const { data: bel } = await supabase
      .from("belief_nodes")
      .select("topic, statement, layer")
      .eq("id", mb)
      .eq("user_id", userId)
      .maybeSingle();
    if (bel) {
      const topic = typeof bel.topic === "string" ? bel.topic : "";
      const statement = typeof bel.statement === "string" ? bel.statement : "";
      const layer = typeof bel.layer === "string" ? bel.layer : "";
      beliefBlock =
        `\n## Their matched belief (from framework)\n- Topic: ${topic}\n- Layer: ${layer}\n- Statement: ${statement}\n`;
    }
  }

  const tagsLine = Array.isArray(claimRow.doctrine_tags)
    ? (claimRow.doctrine_tags as string[]).filter((t) => typeof t === "string" && t.trim()).join(", ")
    : "";
  const biasLine = Array.isArray(claimRow.bias_flags)
    ? (claimRow.bias_flags as string[]).filter((t) => typeof t === "string" && t.trim()).join(", ")
    : "";
  const tone = typeof claimRow.tone === "string" ? claimRow.tone : "";
  const rel = typeof claimRow.match_relation === "string" ? claimRow.match_relation : "";
  const claimText = typeof claimRow.claim === "string" ? claimRow.claim : "";
  const artTitle = typeof artRow.title === "string" ? artRow.title : "";
  const artKind = typeof artRow.kind === "string" ? artRow.kind : "";
  const artUrl = typeof artRow.url === "string" ? artRow.url : "";
  const verdict = typeof claimRow.verdict === "string" ? claimRow.verdict : null;

  const supJson = (v: unknown) => {
    try {
      return JSON.stringify(v ?? []);
    } catch {
      return "[]";
    }
  };

  const excerpt = transcriptExcerpt?.trim() ? transcriptExcerpt.trim().slice(0, 4000) : "";

  const claimFocusBlock = [
    "## Session focus: one claim from their artifact",
    `Artifact: ${artTitle || "(untitled)"} (${artKind})`,
    artUrl ? `URL: ${artUrl}` : "",
    `[artifact:${artRow.id}]`,
    `[claim:${claimRow.id}]`,
    "",
    "### Claim text (verbatim)",
    claimText,
    "",
    `User verdict on this claim: ${verdictLabel(verdict)}`,
    tone ? `Tone (analysis): ${tone}` : "",
    tagsLine ? `Doctrine tags: ${tagsLine}` : "",
    biasLine ? `Bias / framing flags: ${biasLine}` : "",
    rel ? `Match vs their framework: ${rel}` : "",
    `Supports (JSON): ${supJson(claimRow.scripture_supports)}`,
    `Challenges (JSON): ${supJson(claimRow.scripture_challenges)}`,
    beliefBlock.trimEnd(),
    excerpt ? `\n### Transcript excerpt near this moment (may be partial)\n${excerpt}` : "",
    "",
    "When the user asks whether they approved something: use **User verdict** above. If verdict is not set, say clearly they have not recorded approve/reject/defer yet — do not invent a verdict.",
    "Distinguish **what the speaker said in the transcript** from **what the user decided** about the extracted claim.",
  ].filter(Boolean).join("\n");

  return { claimFocusBlock, artifactId, claimId };
}

/** Other claims on the same artifact (for cross-claim questions). */
export async function buildArtifactClaimsDigest(
  supabase: SupabaseClient,
  userId: string,
  artifactId: string,
  excludeClaimId?: string | null,
  limit = 24,
): Promise<string> {
  const { data: rows } = await supabase
    .from("artifact_claims")
    .select("id, claim, verdict, created_at")
    .eq("user_id", userId)
    .eq("artifact_id", artifactId)
    .order("created_at", { ascending: true })
    .limit(limit);

  const lines: string[] = [];
  for (const r of rows ?? []) {
    const id = r.id as string;
    if (excludeClaimId && id === excludeClaimId) continue;
    const claim = typeof r.claim === "string" ? r.claim.trim() : "";
    if (!claim) continue;
    const verdict = typeof r.verdict === "string" ? r.verdict : null;
    lines.push(`[claim:${id}] ${claim.slice(0, 280)} — verdict: ${verdictLabel(verdict)}`);
  }
  return lines.length ? lines.join("\n") : "(no other claims on this artifact)";
}
