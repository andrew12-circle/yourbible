import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { getEmbedding } from "../_shared/aiProvider.ts";
import { youtubeWatchUrlFromArtifact } from "./enrichCitations.ts";

const MAX_CONTEXT_CHARS = 28_000;
const BODY_PREVIEW = 700;

/** Beliefs + journals — the user's marked framework (primary memory). */
const FRAMEWORK_RETRIEVAL = {
  normal: {
    beliefMatch: 18,
    journalMatch: 14,
    beliefLines: 16,
    journalLines: 10,
    coreBeliefCap: 28,
    mindMapLinks: 24,
    frameworkClaims: 20,
  },
  deep: {
    beliefMatch: 28,
    journalMatch: 20,
    beliefLines: 24,
    journalLines: 14,
    coreBeliefCap: 40,
    mindMapLinks: 32,
    frameworkClaims: 30,
  },
} as const;

/** Semantic search limits — queries the full library via vector RPCs, not recent uploads. */
const ARTIFACT_RETRIEVAL = {
  normal: {
    claimMatch: 28,
    transcriptMatch: 36,
    claimLines: 14,
    transcriptLines: 16,
    relevantLibrary: 18,
    titleKeyword: 24,
    rawTextKeywordPerToken: 10,
  },
  deep: {
    claimMatch: 48,
    transcriptMatch: 56,
    claimLines: 22,
    transcriptLines: 28,
    relevantLibrary: 24,
    titleKeyword: 32,
    rawTextKeywordPerToken: 14,
  },
} as const;

const RECENT_ARTIFACT_FALLBACK = 5;

// Recency half-life in days for the recency boost component.
const RECENCY_HALF_LIFE_DAYS = 60;

const STOPWORDS = new Set([
  "that","this","with","from","your","have","what","when","where","which","their","there","about",
  "would","could","should","because","think","really","just","into","than","then","them","some",
  "will","been","were","they","like","also","very","more","most","other","only","such","make",
  "does","did","each","much","even","well","want","need","know","help","please","tell","give",
  "and","but","for","not","you","are","was","the","can","has","had","his","her","our","out","all","any",
]);

export type RetrievedCitation = {
  source_type: "belief" | "journal" | "artifact" | "entity" | "identity" | "general" | "influence";
  id?: string;
  label: string;
  /** YouTube watch URL when source_type is artifact and kind is youtube. */
  url?: string;
  /** Transcript moment start — appended as &t= on YouTube links. */
  start_seconds?: number;
};

export type RetrievedContextPack = {
  contextBlock: string;
  /** Rows actually injected into context — merged into assistant citations server-side. */
  retrievedCitations: RetrievedCitation[];
};

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }

function tokenize(message: string): string[] {
  return message.toLowerCase().split(/[^a-z0-9]+/g).filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}
function keywordHits(text: string, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = text.toLowerCase();
  let n = 0; for (const t of tokens) if (hay.includes(t)) n++;
  return n;
}
function truncate(s: string, max: number): string { return s.length <= max ? s : s.slice(0, max - 1) + "…"; }
function ageDays(ts: string | null | undefined): number {
  if (!ts) return 9999;
  const d = new Date(ts).getTime();
  if (!isFinite(d)) return 9999;
  return Math.max(0, (Date.now() - d) / 86_400_000);
}
function recencyScore(ts: string | null | undefined): number {
  return Math.pow(0.5, ageDays(ts) / RECENCY_HALF_LIFE_DAYS);
}

function vecLiteral(v: number[]): string { return `[${v.join(",")}]`; }

type ArtifactRow = {
  id: string;
  title?: string | null;
  kind?: string | null;
  status?: string | null;
  url?: string | null;
  metadata?: unknown;
};

function looksLikeViewCountTitle(title: string): boolean {
  return /^\d[\d,.\s]*\s*views?$/i.test(title.trim());
}

function artifactTitleFromRow(row: ArtifactRow): string {
  const stored = typeof row.title === "string" ? row.title.trim() : "";
  if (stored && !looksLikeViewCountTitle(stored)) return truncate(stored, 120);
  if (isRecord(row.metadata)) {
    const metaTitle = typeof row.metadata.title === "string" ? row.metadata.title.trim() : "";
    if (metaTitle) return truncate(metaTitle, 120);
  }
  if (row.kind === "youtube") return "YouTube video";
  if (row.kind === "podcast") return "Podcast";
  if (row.kind === "pdf") return "PDF document";
  return "Untitled artifact";
}

function artifactChannelFromMeta(meta: unknown): string {
  if (!isRecord(meta)) return "";
  const channel = [meta.channel_title, meta.channelTitle, meta.channel].find(
    (x) => typeof x === "string" && x.trim(),
  ) as string | undefined;
  return channel?.trim() ?? "";
}

function artifactKindLabel(kind: string | null | undefined): string {
  if (kind === "youtube") return "Video";
  if (kind === "podcast") return "Podcast";
  if (kind === "pdf") return "PDF";
  if (kind === "text_file") return "Document";
  return "Artifact";
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function citationLabel(text: string, max = 48): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "Source";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function artifactCitation(
  artifactId: string,
  label: string,
  artifactById: Map<string, ArtifactRow>,
  startSeconds?: number,
): RetrievedCitation {
  const art = artifactById.get(artifactId);
  const entry: RetrievedCitation = {
    source_type: "artifact",
    id: artifactId,
    label: citationLabel(label),
  };
  if (art) {
    const watch = youtubeWatchUrlFromArtifact(art);
    if (watch) entry.url = watch;
  }
  if (startSeconds != null && startSeconds > 0) entry.start_seconds = startSeconds;
  return entry;
}

export function mergeRetrievedCitations<T extends RetrievedCitation>(...groups: T[][]): T[] {
  const byKey = new Map<string, T>();
  for (const group of groups) {
    for (const c of group) {
      const key = `${c.source_type}|${c.id ?? ""}|${c.label}`;
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, c);
        continue;
      }
      byKey.set(key, {
        ...prev,
        ...c,
        url: c.url ?? prev.url,
        start_seconds: c.start_seconds ?? prev.start_seconds,
      } as T);
    }
  }
  return [...byKey.values()];
}

function shrinkToLimit(parts: string[], max: number): string {
  let body = parts.join("\n\n");
  if (body.length <= max) return body;
  const p = [...parts];
  let safety = 0;
  while (body.length > max && safety < 40) {
    safety++;
    const last = p.length - 1;
    if (last <= 2) return truncate(body, max);
    const tail = p[last] ?? "";
    if (tail.length > 400) p[last] = tail.slice(0, Math.max(200, Math.floor(tail.length * 0.7))) + "…\n(truncated)";
    else p.pop();
    body = p.join("\n\n");
  }
  return body.length > max ? truncate(body, max) : body;
}

type BeliefHit = { id: string; statement: string; topic: string; layer: string; confidence: number; is_core: boolean; updated_at: string; similarity: number };
type JournalHit = { id: string; title: string | null; body: string; summary: string | null; entry_at_ts: string; similarity: number };
type ClaimHit = {
  id: string;
  artifact_id: string;
  claim: string;
  verdict: string | null;
  created_at: string;
  similarity: number;
  matched_belief_id?: string | null;
  match_relation?: string | null;
};
type TranscriptChunkHit = {
  id: string;
  artifact_id: string;
  start_seconds: number;
  end_seconds: number | null;
  text: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};
type EntityHit = { id: string; title: string; subtitle: string | null; kind: string; last_seen_at: string; similarity: number };
type AsstHit = { id: string; chat_id: string; content: string; created_at: string; similarity: number };

export type RetrievalOptions = {
  /** Deep inward pass — higher semantic limits + broader keyword scan. */
  librarySearch?: boolean;
  /** Pin one artifact (e.g. opened from artifact detail). */
  pinnedArtifactId?: string | null;
  pinnedTranscriptExcerpt?: string | null;
};

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function sortBySimilarity<T extends { similarity?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
}

function dedupeTranscriptHits(hits: TranscriptChunkHit[]): TranscriptChunkHit[] {
  const seen = new Set<string>();
  const out: TranscriptChunkHit[] = [];
  for (const h of hits) {
    const key = `${h.artifact_id}:${h.start_seconds}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

async function searchArtifactsByTitleTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: string[],
  limit: number,
): Promise<ArtifactRow[]> {
  if (!tokens.length) return [];
  const orParts = tokens.slice(0, 5).map((t) => `title.ilike.%${escapeIlike(t)}%`);
  const { data } = await supabase
    .from("artifacts")
    .select("id, title, kind, status, url, metadata, created_at")
    .eq("user_id", userId)
    .neq("status", "failed")
    .or(orParts.join(","))
    .limit(limit);
  return (data ?? []) as ArtifactRow[];
}

async function searchArtifactsByRawTextToken(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  limit: number,
): Promise<(ArtifactRow & { raw_text?: string | null })[]> {
  if (!token || token.length < 4) return [];
  const { data } = await supabase
    .from("artifacts")
    .select("id, title, kind, status, url, metadata, created_at, raw_text")
    .eq("user_id", userId)
    .neq("status", "failed")
    .ilike("raw_text", `%${escapeIlike(token)}%`)
    .limit(limit);
  return (data ?? []) as (ArtifactRow & { raw_text?: string | null })[];
}

async function buildPinnedArtifactBlock(
  supabase: SupabaseClient,
  userId: string,
  artifactId: string,
  transcriptExcerpt?: string | null,
): Promise<string | null> {
  const { data: artRow } = await supabase
    .from("artifacts")
    .select("id, title, kind, status, url, metadata")
    .eq("id", artifactId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!artRow) return null;

  const art = artRow as ArtifactRow;
  const title = artifactTitleFromRow(art);
  const channel = artifactChannelFromMeta(art.metadata);
  const { data: claimRows } = await supabase
    .from("artifact_claims")
    .select("id, claim, verdict")
    .eq("artifact_id", artifactId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(10);

  const claimLines = (claimRows ?? [])
    .map((r) => {
      const claim = typeof r.claim === "string" ? r.claim.trim() : "";
      if (!claim) return "";
      const verdict = typeof r.verdict === "string" && r.verdict.trim() ? ` (verdict: ${r.verdict})` : "";
      return `- ${truncate(claim, 280)}${verdict}`;
    })
    .filter(Boolean);

  const excerpt = transcriptExcerpt?.trim() ? transcriptExcerpt.trim().slice(0, 4000) : "";
  return [
    "## Pinned artifact (user opened chat from this source — prioritize it)",
    `[artifact:${artifactId}] ${artifactKindLabel(art.kind)}: "${title}"${channel ? ` · ${channel}` : ""}`,
    art.url ? `URL: ${art.url}` : "",
    claimLines.length ? `\n### Key claims on this artifact\n${claimLines.join("\n")}` : "",
    excerpt ? `\n### Transcript excerpt (client)\n${excerpt}` : "",
  ].filter(Boolean).join("\n");
}

export async function buildFrameworkRetrievalContext(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  userMessage: string,
  excludeJournalEntryId?: string | null,
  options?: RetrievalOptions,
): Promise<RetrievedContextPack> {
  const librarySearch = options?.librarySearch === true;
  const limits = librarySearch ? ARTIFACT_RETRIEVAL.deep : ARTIFACT_RETRIEVAL.normal;
  const frameworkLimits = librarySearch ? FRAMEWORK_RETRIEVAL.deep : FRAMEWORK_RETRIEVAL.normal;
  const pinnedArtifactId = options?.pinnedArtifactId?.trim() || null;
  const tokens = tokenize(userMessage);
  const queryVec = await getEmbedding(userMessage);
  const qLit = queryVec ? vecLiteral(queryVec) : null;
  const beliefCount = frameworkLimits.beliefMatch;
  const journalCount = frameworkLimits.journalMatch;

  // Parallel fetch: profile + history + semantic hits across the FULL library (vector RPCs, not recency).
  const semanticHits = qLit
    ? await Promise.all([
        supabase.rpc("match_beliefs", { query_embedding: qLit, match_count: beliefCount }),
        supabase.rpc("match_journals", { query_embedding: qLit, match_count: journalCount, exclude_id: excludeJournalEntryId ?? null }),
        supabase.rpc("match_artifact_claims", { query_embedding: qLit, match_count: limits.claimMatch }),
        supabase.rpc("match_artifact_transcript", { query_embedding: qLit, match_count: limits.transcriptMatch, filter_artifact_id: null }),
        supabase.rpc("match_entities", { query_embedding: qLit, match_count: 8 }),
        supabase.rpc("match_assistant_messages", { query_embedding: qLit, match_count: 4, exclude_chat_id: chatId }),
      ])
    : [null, null, null, null, null, null];

  const [bRes, jRes, cRes, tRes, eRes, mRes] = semanticHits;

  const keywordTokens = tokens.slice(0, librarySearch ? 5 : 3);
  const [
    profileRes,
    historyRes,
    sourcesRes,
    tensionsRes,
    workbookRes,
    lhReviewRes,
    titleMatchRes,
    pinnedBlockRes,
    coreBeliefsRes,
    beliefLinksRes,
    frameworkClaimsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("identity_summary").eq("user_id", userId).maybeSingle(),
    supabase.from("my_ai_messages").select("role, content, created_at").eq("user_id", userId).eq("chat_id", chatId).order("created_at", { ascending: false }).limit(12),
    supabase.from("belief_sources").select("id, source_type, label, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("belief_tensions").select("id, a_id, b_id, summary, severity, status").eq("user_id", userId).eq("status", "open").order("severity", { ascending: false }).limit(20),
    supabase.from("living_hope_workbook").select("content").eq("user_id", userId).maybeSingle(),
    supabase.from("living_hope_reviews").select("review_date,vision_recall,surrender_note,goal_touches,completed_at").eq("user_id", userId).order("review_date", { ascending: false }).limit(3),
    searchArtifactsByTitleTokens(supabase, userId, keywordTokens, limits.titleKeyword),
    pinnedArtifactId
      ? buildPinnedArtifactBlock(supabase, userId, pinnedArtifactId, options?.pinnedTranscriptExcerpt)
      : Promise.resolve(null),
    supabase
      .from("belief_nodes")
      .select("id, statement, topic, layer, confidence, is_core, updated_at")
      .eq("user_id", userId)
      .eq("is_core", true)
      .order("confidence", { ascending: false })
      .limit(frameworkLimits.coreBeliefCap),
    supabase
      .from("belief_links")
      .select("a_id, b_id, relation")
      .eq("user_id", userId)
      .limit(frameworkLimits.mindMapLinks),
    supabase
      .from("artifact_claims")
      .select("id, claim, artifact_id, matched_belief_id, match_relation, verdict, created_at")
      .eq("user_id", userId)
      .not("matched_belief_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(frameworkLimits.frameworkClaims),
  ]);

  const { data: cogState } = await supabase
    .from("user_cognitive_state")
    .select("worldview_summary, evolution_summary, recurring_themes, unresolved_tensions, current_season, voice_signature, core_frameworks, last_swept_at")
    .eq("user_id", userId)
    .maybeSingle();

  // Score beliefs: 0.55 sem + 0.20 recency + 0.15 confidence/core + 0.10 keyword
  const beliefHits: BeliefHit[] = ((bRes && !bRes.error) ? (bRes.data ?? []) : []) as BeliefHit[];
  const scoredBeliefs = beliefHits.map((b) => {
    const sem = Math.max(0, b.similarity ?? 0);
    const rec = recencyScore(b.updated_at);
    const conf = b.is_core ? 1 : Math.min(1, Math.max(0, (b.confidence ?? 50) / 100));
    const kw = Math.min(1, keywordHits(`${b.topic} ${b.statement}`, tokens) / 3);
    const score = 0.55 * sem + 0.20 * rec + 0.15 * conf + 0.10 * kw;
    return { ...b, score };
  }).sort((a, b) => b.score - a.score);

  const coreBeliefs = ((coreBeliefsRes.data ?? []) as BeliefHit[]).map((b) => ({
    ...b,
    similarity: Math.max(b.similarity ?? 0, 0.95),
    score: 1,
  }));
  const beliefById = new Map<string, BeliefHit & { score?: number }>();
  for (const b of coreBeliefs) beliefById.set(b.id, b);
  for (const b of scoredBeliefs) {
    if (!beliefById.has(b.id)) beliefById.set(b.id, b);
  }
  const mergedBeliefs = [...beliefById.values()]
    .sort((a, b) => (b.score ?? b.similarity ?? 0) - (a.score ?? a.similarity ?? 0))
    .slice(0, frameworkLimits.beliefLines);

  const beliefHitIds = new Set(mergedBeliefs.map((b) => b.id));

  const linkRows = (beliefLinksRes.data ?? []) as { a_id: string; b_id: string; relation: string | null }[];
  const missingLinkBeliefIds = [
    ...new Set(linkRows.flatMap((l) => [l.a_id, l.b_id])),
  ].filter((id) => !beliefById.has(id));
  if (missingLinkBeliefIds.length) {
    const { data: linkBeliefs } = await supabase
      .from("belief_nodes")
      .select("id, statement, topic, layer, confidence, is_core, updated_at")
      .eq("user_id", userId)
      .in("id", missingLinkBeliefIds);
    for (const b of (linkBeliefs ?? []) as BeliefHit[]) {
      beliefById.set(b.id, { ...b, similarity: 0 });
    }
  }

  const beliefTopicLabel = (id: string): string => {
    const b = beliefById.get(id);
    if (!b) return "Belief";
    return truncate((b.topic?.trim() || b.statement || "Belief").replace(/\s+/g, " "), 56);
  };

  // Temporal slice: latest 2 belief_versions for each hit belief.
  const temporalLines: string[] = [];
  if (beliefHitIds.size) {
    const { data: vRows } = await supabase
      .from("belief_versions")
      .select("belief_id, snapshot, created_at")
      .eq("user_id", userId)
      .in("belief_id", [...beliefHitIds])
      .order("created_at", { ascending: false })
      .limit(60);
    const perBelief = new Map<string, { snapshot: unknown; created_at: string }[]>();
    for (const r of (vRows ?? []) as { belief_id: string; snapshot: unknown; created_at: string }[]) {
      const list = perBelief.get(r.belief_id) ?? [];
      if (list.length < 2) list.push({ snapshot: r.snapshot, created_at: r.created_at });
      perBelief.set(r.belief_id, list);
    }
    for (const [bid, vs] of perBelief) {
      if (vs.length < 2) continue; // need a trajectory
      const stOf = (s: unknown) => {
        if (isRecord(s) && typeof s.statement === "string") return s.statement;
        return "";
      };
      const newer = stOf(vs[0].snapshot);
      const older = stOf(vs[1].snapshot);
      if (!newer || !older || newer === older) continue;
      temporalLines.push(
        `[belief:${bid}] trajectory: EARLIER (${vs[1].created_at.slice(0,10)}): "${truncate(older, 220)}" → LATER (${vs[0].created_at.slice(0,10)}): "${truncate(newer, 220)}"`,
      );
    }
  }

  // Tension slice: keep tensions touching a hit belief OR with summary that keyword-matches.
  const tensions = ((tensionsRes.data ?? []) as { id: string; a_id: string; b_id: string; summary: string; severity: number; status: string }[])
    .filter((t) => beliefHitIds.has(t.a_id) || beliefHitIds.has(t.b_id) || keywordHits(t.summary, tokens) > 0)
    .slice(0, 6);

  const journalHitsRaw: JournalHit[] = ((jRes && !jRes.error) ? (jRes.data ?? []) : []) as JournalHit[];
  const scoredJournals = journalHitsRaw.map((j) => {
    const sem = Math.max(0, j.similarity ?? 0);
    const rec = recencyScore(j.entry_at_ts);
    const text = (j.summary ?? "") + " " + (j.body ?? "");
    const kw = Math.min(1, keywordHits(text, tokens) / 3);
    const score = 0.60 * sem + 0.25 * rec + 0.15 * kw;
    return { ...j, score };
  }).sort((a, b) => b.score - a.score).slice(0, frameworkLimits.journalLines);

  // If no semantic hits at all (no embeddings yet), fall back to recent journals.
  let fallbackJournals: JournalHit[] = [];
  if (!scoredJournals.length) {
    let q = supabase.from("journal_entries").select("id,title,body,summary,entry_at_ts")
      .eq("user_id", userId).eq("e2e_encrypted", false)
      .or("entry_kind.is.null,entry_kind.neq.vent")
      .order("entry_at_ts", { ascending: false }).limit(5);
    if (excludeJournalEntryId) q = q.neq("id", excludeJournalEntryId);
    const { data } = await q;
    fallbackJournals = ((data ?? []) as JournalHit[]).map((j) => ({ ...j, similarity: 0 }));
  }

  const claimHits = sortBySimilarity(((cRes && !cRes.error) ? (cRes.data ?? []) : []) as ClaimHit[]);
  let transcriptHits = dedupeTranscriptHits(
    sortBySimilarity(((tRes && !tRes.error) ? (tRes.data ?? []) : []) as TranscriptChunkHit[]),
  );
  const entityHits = ((eRes && !eRes.error) ? (eRes.data ?? []) : []) as EntityHit[];
  const asstHits = ((mRes && !mRes.error) ? (mRes.data ?? []) : []) as AsstHit[];
  const titleMatches = titleMatchRes;

  const artifactById = new Map<string, ArtifactRow>();
  for (const row of titleMatches) artifactById.set(row.id, row);

  if (keywordTokens.length) {
    const seenTranscriptKeys = new Set(transcriptHits.map((t) => `${t.artifact_id}:${t.start_seconds}`));
    for (const token of keywordTokens) {
      const rawMatches = await searchArtifactsByRawTextToken(
        supabase,
        userId,
        token,
        limits.rawTextKeywordPerToken,
      );
      for (const row of rawMatches) {
        artifactById.set(row.id, row);
        const title = artifactTitleFromRow(row);
        const hay = `${title} ${row.raw_text ?? ""}`;
        if (keywordHits(hay, keywordTokens) < 1) continue;
        if (seenTranscriptKeys.size >= limits.transcriptLines + 8) break;
        const excerpt = (row.raw_text ?? "").replace(/\s+/g, " ").trim();
        if (!excerpt) continue;
        const idx = hay.toLowerCase().indexOf(token);
        const start = Math.max(0, idx - 120);
        const snippet = excerpt.slice(start, start + 420);
        if (!snippet) continue;
        const key = `${row.id}:kw-${token}`;
        if (seenTranscriptKeys.has(key)) continue;
        seenTranscriptKeys.add(key);
        transcriptHits.push({
          id: `kw-${row.id}-${token}`,
          artifact_id: row.id,
          start_seconds: 0,
          end_seconds: null,
          text: snippet,
          metadata: { keyword_match: true, token },
          similarity: 0.58,
        });
      }
    }
    transcriptHits = dedupeTranscriptHits(sortBySimilarity(transcriptHits));
  }

  const artifactIdsForMeta = new Set<string>([
    ...claimHits.map((c) => c.artifact_id),
    ...transcriptHits.map((t) => t.artifact_id),
    ...titleMatches.map((a) => a.id),
    ...(pinnedArtifactId ? [pinnedArtifactId] : []),
  ]);

  const missingArtifactIds = [...artifactIdsForMeta].filter((id) => !artifactById.has(id));
  if (missingArtifactIds.length) {
    const { data: extraArtifacts } = await supabase
      .from("artifacts")
      .select("id, title, kind, status, url, metadata, created_at")
      .eq("user_id", userId)
      .in("id", missingArtifactIds);
    for (const row of (extraArtifacts ?? []) as ArtifactRow[]) artifactById.set(row.id, row);
  }

  const artifactRelevance = new Map<string, number>();
  const bumpArtifactScore = (artifactId: string, score: number) => {
    artifactRelevance.set(artifactId, Math.max(artifactRelevance.get(artifactId) ?? 0, score));
  };
  for (const c of claimHits) bumpArtifactScore(c.artifact_id, c.similarity ?? 0);
  for (const t of transcriptHits) bumpArtifactScore(t.artifact_id, t.similarity ?? 0);
  for (const a of titleMatches) bumpArtifactScore(a.id, 0.62);
  if (pinnedArtifactId) bumpArtifactScore(pinnedArtifactId, 1);

  let recentFallbackLines: string[] = [];
  if (artifactRelevance.size < 4) {
    const { data: recentArtifactsRes } = await supabase
      .from("artifacts")
      .select("id, title, kind, status, url, metadata, created_at")
      .eq("user_id", userId)
      .neq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(RECENT_ARTIFACT_FALLBACK);
    for (const row of (recentArtifactsRes ?? []) as ArtifactRow[]) {
      if (!artifactById.has(row.id)) artifactById.set(row.id, row);
    }
    recentFallbackLines = ((recentArtifactsRes ?? []) as ArtifactRow[]).map((a) => {
      const title = artifactTitleFromRow(a);
      const channel = artifactChannelFromMeta(a.metadata);
      const kind = artifactKindLabel(a.kind);
      const channelBit = channel ? ` · ${channel}` : "";
      return `[artifact:${a.id}] ${kind}: "${title}"${channelBit} (recent upload — no strong match this turn)`;
    });
  }

  const artifactLabel = (artifactId: string): string =>
    artifactTitleFromRow(artifactById.get(artifactId) ?? { id: artifactId });

  const retrievedCitations: RetrievedCitation[] = [];

  // Recent thread history (oldest → newest)
  const historyAsc = ((historyRes.data ?? []) as { role: string; content: string }[]).slice().reverse();

  const identityJson = profileRes.data?.identity_summary != null
    ? truncate(JSON.stringify(profileRes.data.identity_summary), 3500)
    : "(none — identity summary not generated yet)";

  // Build sections
  const beliefLines = mergedBeliefs.map((b) => {
    retrievedCitations.push({
      source_type: "belief",
      id: b.id,
      label: citationLabel(b.topic || b.statement),
    });
    return `[belief:${b.id}] (${b.layer}${b.is_core ? "·core" : ""}, conf ${b.confidence}) ${b.topic}: ${truncate(b.statement, 480)} (updated ${b.updated_at.slice(0,10)}, sim ${b.similarity.toFixed(2)})`;
  });

  const journals = scoredJournals.length ? scoredJournals : fallbackJournals;
  const journalLines = journals.map((j) => {
    const title = j.title?.trim() || "(untitled)";
    retrievedCitations.push({ source_type: "journal", id: j.id, label: citationLabel(title) });
    const day = j.entry_at_ts.slice(0, 10);
    const text = (j.summary?.trim() || j.body || "").replace(/\s+/g, " ").trim();
    const sim = "similarity" in j && j.similarity ? ` sim ${j.similarity.toFixed(2)}` : "";
    return `[journal:${j.id}] ${day} — ${title}:${sim} ${truncate(text, BODY_PREVIEW)}`;
  });

  const mindMapLinkLines = linkRows.map((l) => {
    const rel = typeof l.relation === "string" && l.relation.trim() ? l.relation.trim() : "linked";
    return `[belief:${l.a_id}] ↔ [belief:${l.b_id}] (${rel}) — "${beliefTopicLabel(l.a_id)}" · "${beliefTopicLabel(l.b_id)}"`;
  });

  type FrameworkClaimRow = {
    id: string;
    claim: string;
    artifact_id: string;
    matched_belief_id: string | null;
    match_relation: string | null;
    verdict: string | null;
  };
  const frameworkClaimRows = (frameworkClaimsRes.data ?? []) as FrameworkClaimRow[];
  const prioritizedFrameworkClaims = [...frameworkClaimRows]
    .sort((a, b) => {
      const aHit = beliefHitIds.has(a.matched_belief_id ?? "") ? 1 : 0;
      const bHit = beliefHitIds.has(b.matched_belief_id ?? "") ? 1 : 0;
      return bHit - aHit;
    })
    .slice(0, frameworkLimits.frameworkClaims);
  const frameworkClaimIds = new Set(prioritizedFrameworkClaims.map((c) => c.id));

  const frameworkClaimLines = prioritizedFrameworkClaims.map((c) => {
    const artTitle = artifactLabel(c.artifact_id);
    const beliefId = c.matched_belief_id ?? "";
    retrievedCitations.push(artifactCitation(c.artifact_id, artTitle, artifactById));
    if (beliefId) {
      retrievedCitations.push({
        source_type: "belief",
        id: beliefId,
        label: citationLabel(beliefTopicLabel(beliefId)),
      });
    }
    const rel = c.match_relation?.trim() || "mapped";
    const verdictBit = c.verdict?.trim() ? ` · your verdict: ${c.verdict}` : "";
    return `[artifact:${c.artifact_id}] vs [belief:${beliefId}] (${rel}) — from "${artTitle}": ${truncate(c.claim, 300)}${verdictBit}`;
  });

  const claimLines = claimHits
    .filter((c) => !frameworkClaimIds.has(c.id))
    .slice(0, limits.claimLines)
    .map((c) => {
    const art = artifactById.get(c.artifact_id);
    const title = artifactLabel(c.artifact_id);
    const channel = art ? artifactChannelFromMeta(art.metadata) : "";
    retrievedCitations.push(artifactCitation(c.artifact_id, title, artifactById));
    const verdictBit = c.verdict?.trim() ? ` (verdict: ${c.verdict})` : "";
    const sourceBit = channel ? ` — ${title} (${channel})` : ` — ${title}`;
    return `[artifact:${c.artifact_id}] claim${sourceBit}: ${truncate(c.claim, 320)}${verdictBit} (sim ${c.similarity.toFixed(2)})`;
  });

  const transcriptLines = transcriptHits.slice(0, limits.transcriptLines).map((t) => {
    const art = artifactById.get(t.artifact_id);
    const title = artifactLabel(t.artifact_id);
    const channel = art ? artifactChannelFromMeta(art.metadata) : "";
    retrievedCitations.push(artifactCitation(t.artifact_id, title, artifactById, t.start_seconds));
    const end = t.end_seconds != null ? `${formatTimestamp(t.start_seconds)}–${formatTimestamp(t.end_seconds)}` : formatTimestamp(t.start_seconds);
    const sourceBit = channel ? `${title} (${channel})` : title;
    return `[artifact:${t.artifact_id}] "${sourceBit}" @ ${end} — ${truncate(t.text.replace(/\s+/g, " "), 400)} (sim ${t.similarity.toFixed(2)})`;
  });

  const libraryLines = [...artifactRelevance.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limits.relevantLibrary)
    .map(([artifactId, score]) => {
      const a = artifactById.get(artifactId);
      if (!a) return "";
      const title = artifactTitleFromRow(a);
      const channel = artifactChannelFromMeta(a.metadata);
      const kind = artifactKindLabel(a.kind);
      const status = typeof a.status === "string" && a.status !== "ready" ? ` · ${a.status}` : "";
      const channelBit = channel ? ` · ${channel}` : "";
      return `[artifact:${artifactId}] ${kind}: "${title}"${channelBit}${status} (relevance ${score.toFixed(2)})`;
    })
    .filter(Boolean);

  const pinnedBlock = pinnedBlockRes;

  const entityLines = entityHits.slice(0, 6).map((e) => {
    retrievedCitations.push({ source_type: "entity", id: e.id, label: citationLabel(e.title) });
    const sub = e.subtitle?.trim() ? ` — ${e.subtitle}` : "";
    return `[entity:${e.id}] (${e.kind}) ${e.title}${sub} (sim ${e.similarity.toFixed(2)})`;
  });

  const tensionLines = tensions.map((t) => {
    retrievedCitations.push({ source_type: "belief", id: t.a_id, label: "Open tension" });
    return `[tension:${t.id}] (severity ${t.severity}) between [belief:${t.a_id}] and [belief:${t.b_id}] — ${truncate(t.summary, 360)}`;
  });

  const asstLines = asstHits.slice(0, 4).map((m) =>
    `[past-reply ${m.created_at.slice(0,10)}, sim ${m.similarity.toFixed(2)}] ${truncate(m.content.replace(/\s+/g, " "), 360)}`,
  );

  const sourceSeen = new Set<string>();
  const sourceLines: string[] = [];
  for (const s of (sourcesRes.data ?? []) as { id: string; source_type: string; label: string }[]) {
    const key = `${s.source_type.toLowerCase()}::${s.label.trim().toLowerCase()}`;
    if (sourceSeen.has(key)) continue;
    sourceSeen.add(key);
    retrievedCitations.push({ source_type: "influence", id: s.id, label: citationLabel(s.label) });
    sourceLines.push(`[influence:${s.id}] ${s.label} (${s.source_type})`);
    if (sourceLines.length >= 12) break;
  }

  const historyBlock = historyAsc
    .map((h) => `${h.role.toUpperCase()}: ${truncate(h.content.replace(/\s+/g, " ").trim(), 900)}`)
    .join("\n");

  const livingHopeBlock = formatLivingHopeContext(workbookRes.data?.content, lhReviewRes.data ?? []);

  const libraryIntro =
    "Semantic search across your entire saved library (not limited to recent uploads). Name titles when you use them.";
  const libraryDeepNote = librarySearch
    ? "\n\n(Library deep-search mode — even higher limits on transcript and claim matches.)"
    : "";

  const sections: string[] = [
    "## Living cognitive state (compressed identity from last nightly sweep — this is the user's voice and current season; honor it)\n" + (cogState
      ? (() => {
          const lines: string[] = [];
          if (typeof cogState.current_season === "string" && cogState.current_season.trim()) lines.push(`Current season: ${cogState.current_season}`);
          if (typeof cogState.worldview_summary === "string" && cogState.worldview_summary.trim()) lines.push(`Worldview: ${cogState.worldview_summary}`);
          if (typeof cogState.evolution_summary === "string" && cogState.evolution_summary.trim()) lines.push(`Recent evolution: ${cogState.evolution_summary}`);
          if (Array.isArray(cogState.recurring_themes) && cogState.recurring_themes.length) lines.push(`Recurring themes: ${(cogState.recurring_themes as unknown[]).filter((x) => typeof x === "string").join(", ")}`);
          if (Array.isArray(cogState.core_frameworks) && cogState.core_frameworks.length) lines.push(`Core frameworks: ${(cogState.core_frameworks as unknown[]).filter((x) => typeof x === "string").join(" · ")}`);
          if (Array.isArray(cogState.unresolved_tensions) && cogState.unresolved_tensions.length) {
            lines.push("Unresolved tensions they're sitting in:");
            for (const t of cogState.unresolved_tensions as unknown[]) {
              if (typeof t === "string") lines.push(`- ${t}`);
            }
          }
          if (typeof cogState.voice_signature === "string" && cogState.voice_signature.trim()) lines.push(`Voice signature (match this cadence): ${cogState.voice_signature}`);
          return lines.length ? lines.join("\n") : "(empty)";
        })()
      : "(not generated yet — speak from raw context below)"),
    "## Identity summary (profiles.identity_summary)\n" + identityJson,
    ...(pinnedBlock?.trim() ? [pinnedBlock.trim()] : []),
    "## Your framework — beliefs you marked (PRIMARY — anchor every answer here first; core beliefs always included)\n" + (beliefLines.length ? beliefLines.join("\n") : "(none recorded yet)"),
    "## Belief trajectories — EARLIER → LATER (use to name evolution; do not invent transitions not shown here)\n" + (temporalLines.length ? temporalLines.join("\n") : "(none recorded)"),
    "## Mind map — how your beliefs connect (same graph as /framework/graph)\n" + (mindMapLinkLines.length ? mindMapLinkLines.join("\n") : "(no belief links recorded yet)"),
    "## Open tensions adjacent to this turn (surface them if relevant)\n" + (tensionLines.length ? tensionLines.join("\n") : "(none)"),
    "## Your journals (PRIMARY — your lived voice; cite dates when you use them)\n" + (journalLines.length ? journalLines.join("\n") : "(none)"),
    "## Speaker claims mapped to YOUR framework (compare what they said against your beliefs — not the other way around)\n" + (frameworkClaimLines.length ? frameworkClaimLines.join("\n") : "(none mapped yet — run analysis on artifacts to link claims to beliefs)"),
    "## Transcript moments from videos & artifacts (SECONDARY — lenses; cite title + timestamp when relevant)\n" + (transcriptLines.length ? transcriptLines.join("\n") : "(none — transcripts may still be processing)"),
    "## Other claims from your library (semantic search — full library)\n" + (claimLines.length ? claimLines.join("\n") : "(none)"),
    "## Relevant artifacts from your library\n" + libraryIntro + "\n" + (libraryLines.length ? libraryLines.join("\n") : "(no artifact matches this turn)") + libraryDeepNote,
    "## Morning formula (Living Hope — vision workbook + recent reviews)\n" + livingHopeBlock,
    "## Most-relevant knowledge entities\n" + (entityLines.length ? entityLines.join("\n") : "(none)"),
    "## Influences / sources\n" + (sourceLines.length ? sourceLines.join("\n") : "(none)"),
    "## Echoes from past AI replies (other threads — for continuity, not to quote)\n" + (asstLines.length ? asstLines.join("\n") : "(none)"),
    ...(recentFallbackLines.length
      ? ["## Recent uploads (weak matches this turn — fallback only)\n" + recentFallbackLines.join("\n")]
      : []),
    "## This chat (most recent messages, oldest → newest)\n" + (historyBlock || "(empty)"),
  ];

  return {
    contextBlock: shrinkToLimit(sections, MAX_CONTEXT_CHARS),
    retrievedCitations: mergeRetrievedCitations(retrievedCitations),
  };
}

function formatLivingHopeContext(workbookRaw: unknown, reviews: unknown[]): string {
  const lines: string[] = [];
  if (isRecord(workbookRaw)) {
    const headline = typeof workbookRaw.vision_headline === "string" ? workbookRaw.vision_headline.trim() : "";
    if (headline) lines.push(`Vision headline: ${truncate(headline, 280)}`);
    const manifesto = Array.isArray(workbookRaw.manifesto) ? workbookRaw.manifesto : [];
    for (const item of manifesto.slice(0, 4)) {
      if (!isRecord(item)) continue;
      const text = typeof item.text === "string" ? item.text.trim() : "";
      if (text) lines.push(`Manifesto: ${truncate(text, 220)}`);
    }
    const stories = Array.isArray(workbookRaw.stories) ? workbookRaw.stories : [];
    for (const item of stories.slice(0, 2)) {
      if (!isRecord(item)) continue;
      const text = typeof item.text === "string" ? item.text.trim() : "";
      if (text) lines.push(`Daily story: ${truncate(text, 220)}`);
    }
  }
  for (const r of reviews) {
    if (!isRecord(r)) continue;
    const day = typeof r.review_date === "string" ? r.review_date : "";
    const recall = typeof r.vision_recall === "string" ? r.vision_recall.trim() : "";
    const surrender = typeof r.surrender_note === "string" ? r.surrender_note.trim() : "";
    if (recall) lines.push(`Review ${day} vision recall: ${truncate(recall, 240)}`);
    if (surrender) lines.push(`Review ${day} surrender: ${truncate(surrender, 200)}`);
  }
  return lines.length ? lines.join("\n") : "(none — Morning formula workbook not filled yet)";
}

type PartnerPeerRpcRow = { connection_id: string; peer_user_id: string; peer_display_name: string | null; peer_email: string | null };

export async function buildPartnerWalkingAppendixForAi(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: conns, error: cErr } = await supabase
    .from("partner_connections")
    .select("id,user_a,user_b")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq("is_active", true);
  if (cErr || !conns?.length) return "";

  const { data: peerRows, error: pErr } = await supabase.rpc("partner_peer_displays");
  if (pErr) return "";

  const peers = new Map<string, PartnerPeerRpcRow>();
  for (const p of (peerRows ?? []) as PartnerPeerRpcRow[]) peers.set(p.connection_id, p);

  const blocks: string[] = [];
  for (const row of conns as { id: string; user_a: string; user_b: string }[]) {
    const partnerId = row.user_a === userId ? row.user_b : row.user_a;
    const peer = peers.get(row.id);
    const label = peer?.peer_display_name?.trim() || peer?.peer_email?.split("@")[0] || "Partner";

    const { data: sum, error: sErr } = await supabase
      .from("partner_summaries")
      .select("summary,recent_themes,prayer_points,season_label")
      .eq("connection_id", row.id).eq("owner_user_id", partnerId).maybeSingle();
    if (sErr) continue;
    if (!sum?.summary?.trim()) { blocks.push(`### Walking with ${label}\n(Partner summary not generated yet.)`); continue; }

    const themes = Array.isArray(sum.recent_themes) && sum.recent_themes.length ? sum.recent_themes.join(", ") : "(none listed)";
    const prayers = Array.isArray(sum.prayer_points) && sum.prayer_points.length
      ? sum.prayer_points.map((x: string) => `- ${x}`).join("\n") : "(none shared / hidden)";
    blocks.push(`### Walking with ${label}\n- Season: ${String(sum.season_label || "unspecified")}\n- Summary: ${String(sum.summary)}\n- Themes: ${themes}\n- Prayer points:\n${prayers}`);
  }
  return blocks.length ? blocks.join("\n\n") : "";
}
