import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const MAX_CONTEXT_CHARS = 14_000;
const BODY_PREVIEW = 700;
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMS = 768;

// Recency half-life in days for the recency boost component.
const RECENCY_HALF_LIFE_DAYS = 60;

const STOPWORDS = new Set([
  "that","this","with","from","your","have","what","when","where","which","their","there","about",
  "would","could","should","because","think","really","just","into","than","then","them","some",
  "will","been","were","they","like","also","very","more","most","other","only","such","make",
  "does","did","each","much","even","well","want","need","know","help","please","tell","give",
  "and","but","for","not","you","are","was","the","can","has","had","his","her","our","out","all","any",
]);

export type RetrievedContextPack = { contextBlock: string };

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

async function embedQuery(text: string, geminiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: text.slice(0, 6000) }] },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: EMBEDDING_DIMS,
        }),
      },
    );
    if (!res.ok) return null;
    const j = await res.json() as { embedding?: { values?: number[] } };
    const v = j?.embedding?.values;
    return Array.isArray(v) && v.length === EMBEDDING_DIMS ? v : null;
  } catch { return null; }
}

function vecLiteral(v: number[]): string { return `[${v.join(",")}]`; }

function artifactMetaLine(meta: unknown): string {
  if (!isRecord(meta)) return "";
  const title = typeof meta.title === "string" ? meta.title.trim() : "";
  const channel = [meta.channel, meta.channel_title, meta.channelTitle].find((x) => typeof x === "string" && x.trim()) as string | undefined;
  return [title, channel?.trim() ?? ""].filter(Boolean).join(" · ");
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
type ClaimHit = { id: string; artifact_id: string; claim: string; verdict: string | null; created_at: string; similarity: number };
type EntityHit = { id: string; title: string; subtitle: string | null; kind: string; last_seen_at: string; similarity: number };
type AsstHit = { id: string; chat_id: string; content: string; created_at: string; similarity: number };

export async function buildFrameworkRetrievalContext(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  userMessage: string,
  excludeJournalEntryId?: string | null,
): Promise<RetrievedContextPack> {
  const tokens = tokenize(userMessage);
  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  const queryVec = geminiKey ? await embedQuery(userMessage, geminiKey) : null;
  const qLit = queryVec ? vecLiteral(queryVec) : null;

  // Parallel fetch: profile + recent assistant chat history (always needed) + semantic hits + recent fallbacks.
  const semanticHits = qLit
    ? await Promise.all([
        supabase.rpc("match_beliefs", { query_embedding: qLit, match_count: 14 }),
        supabase.rpc("match_journals", { query_embedding: qLit, match_count: 10, exclude_id: excludeJournalEntryId ?? null }),
        supabase.rpc("match_artifact_claims", { query_embedding: qLit, match_count: 6 }),
        supabase.rpc("match_entities", { query_embedding: qLit, match_count: 8 }),
        supabase.rpc("match_assistant_messages", { query_embedding: qLit, match_count: 4, exclude_chat_id: chatId }),
      ])
    : [null, null, null, null, null];

  const [bRes, jRes, cRes, eRes, mRes] = semanticHits;

  const [profileRes, historyRes, sourcesRes, tensionsRes] = await Promise.all([
    supabase.from("profiles").select("identity_summary").eq("user_id", userId).maybeSingle(),
    supabase.from("my_ai_messages").select("role, content, created_at").eq("user_id", userId).eq("chat_id", chatId).order("created_at", { ascending: false }).limit(12),
    supabase.from("belief_sources").select("id, source_type, label, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("belief_tensions").select("id, a_id, b_id, summary, severity, status").eq("user_id", userId).eq("status", "open").order("severity", { ascending: false }).limit(20),
  ]);

  // Score beliefs: 0.55 sem + 0.20 recency + 0.15 confidence/core + 0.10 keyword
  const beliefHits: BeliefHit[] = ((bRes && !bRes.error) ? (bRes.data ?? []) : []) as BeliefHit[];
  const scoredBeliefs = beliefHits.map((b) => {
    const sem = Math.max(0, b.similarity ?? 0);
    const rec = recencyScore(b.updated_at);
    const conf = b.is_core ? 1 : Math.min(1, Math.max(0, (b.confidence ?? 50) / 100));
    const kw = Math.min(1, keywordHits(`${b.topic} ${b.statement}`, tokens) / 3);
    const score = 0.55 * sem + 0.20 * rec + 0.15 * conf + 0.10 * kw;
    return { ...b, score };
  }).sort((a, b) => b.score - a.score).slice(0, 10);

  const beliefHitIds = new Set(scoredBeliefs.map((b) => b.id));

  // Temporal slice: latest 2 belief_versions for each hit belief.
  let temporalLines: string[] = [];
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
  }).sort((a, b) => b.score - a.score).slice(0, 6);

  // If no semantic hits at all (no embeddings yet), fall back to recent journals.
  let fallbackJournals: JournalHit[] = [];
  if (!scoredJournals.length) {
    let q = supabase.from("journal_entries").select("id,title,body,summary,entry_at_ts")
      .eq("user_id", userId).or("entry_kind.is.null,entry_kind.neq.vent")
      .order("entry_at_ts", { ascending: false }).limit(5);
    if (excludeJournalEntryId) q = q.neq("id", excludeJournalEntryId);
    const { data } = await q;
    fallbackJournals = ((data ?? []) as JournalHit[]).map((j) => ({ ...j, similarity: 0 }));
  }

  const claimHits = ((cRes && !cRes.error) ? (cRes.data ?? []) : []) as ClaimHit[];
  const entityHits = ((eRes && !eRes.error) ? (eRes.data ?? []) : []) as EntityHit[];
  const asstHits = ((mRes && !mRes.error) ? (mRes.data ?? []) : []) as AsstHit[];

  // Recent thread history (oldest → newest)
  const historyAsc = ((historyRes.data ?? []) as { role: string; content: string }[]).slice().reverse();

  const identityJson = profileRes.data?.identity_summary != null
    ? truncate(JSON.stringify(profileRes.data.identity_summary), 3500)
    : "(none — identity summary not generated yet)";

  // Build sections
  const beliefLines = scoredBeliefs.map((b) =>
    `[belief:${b.id}] (${b.layer}${b.is_core ? "·core" : ""}, conf ${b.confidence}) ${b.topic}: ${truncate(b.statement, 480)} (updated ${b.updated_at.slice(0,10)}, sim ${b.similarity.toFixed(2)})`,
  );

  const journals = scoredJournals.length ? scoredJournals : fallbackJournals;
  const journalLines = journals.map((j) => {
    const title = j.title?.trim() || "(untitled)";
    const day = j.entry_at_ts.slice(0, 10);
    const text = (j.summary?.trim() || j.body || "").replace(/\s+/g, " ").trim();
    const sim = "similarity" in j && j.similarity ? ` sim ${j.similarity.toFixed(2)}` : "";
    return `[journal:${j.id}] ${day} — ${title}:${sim} ${truncate(text, BODY_PREVIEW)}`;
  });

  const claimLines = claimHits.slice(0, 5).map((c) => {
    const verdictBit = c.verdict?.trim() ? ` (verdict: ${c.verdict})` : "";
    return `[artifact:${c.artifact_id}] claim — ${truncate(c.claim, 320)}${verdictBit} (sim ${c.similarity.toFixed(2)})`;
  });

  const entityLines = entityHits.slice(0, 6).map((e) => {
    const sub = e.subtitle?.trim() ? ` — ${e.subtitle}` : "";
    return `[entity:${e.id}] (${e.kind}) ${e.title}${sub} (sim ${e.similarity.toFixed(2)})`;
  });

  const tensionLines = tensions.map((t) =>
    `[tension:${t.id}] (severity ${t.severity}) between [belief:${t.a_id}] and [belief:${t.b_id}] — ${truncate(t.summary, 360)}`,
  );

  const asstLines = asstHits.slice(0, 4).map((m) =>
    `[past-reply ${m.created_at.slice(0,10)}, sim ${m.similarity.toFixed(2)}] ${truncate(m.content.replace(/\s+/g, " "), 360)}`,
  );

  const sourceSeen = new Set<string>();
  const sourceLines: string[] = [];
  for (const s of (sourcesRes.data ?? []) as { id: string; source_type: string; label: string }[]) {
    const key = `${s.source_type.toLowerCase()}::${s.label.trim().toLowerCase()}`;
    if (sourceSeen.has(key)) continue;
    sourceSeen.add(key);
    sourceLines.push(`[influence:${s.id}] ${s.label} (${s.source_type})`);
    if (sourceLines.length >= 12) break;
  }

  const historyBlock = historyAsc
    .map((h) => `${h.role.toUpperCase()}: ${truncate(h.content.replace(/\s+/g, " ").trim(), 900)}`)
    .join("\n");

  const sections: string[] = [
    "## Identity summary (profiles.identity_summary)\n" + identityJson,
    "## Most-relevant beliefs (cite with [belief:uuid])\n" + (beliefLines.length ? beliefLines.join("\n") : "(none)"),
    "## Belief trajectories — EARLIER → LATER (use to name evolution; do not invent transitions not shown here)\n" + (temporalLines.length ? temporalLines.join("\n") : "(none recorded)"),
    "## Open tensions adjacent to this turn (surface them if relevant)\n" + (tensionLines.length ? tensionLines.join("\n") : "(none)"),
    "## Most-relevant journals\n" + (journalLines.length ? journalLines.join("\n") : "(none)"),
    "## Most-relevant artifact claims\n" + (claimLines.length ? claimLines.join("\n") : "(none)"),
    "## Most-relevant knowledge entities\n" + (entityLines.length ? entityLines.join("\n") : "(none)"),
    "## Influences / sources\n" + (sourceLines.length ? sourceLines.join("\n") : "(none)"),
    "## Echoes from past AI replies (other threads — for continuity, not to quote)\n" + (asstLines.length ? asstLines.join("\n") : "(none)"),
    "## This chat (most recent messages, oldest → newest)\n" + (historyBlock || "(empty)"),
  ];

  return { contextBlock: shrinkToLimit(sections, MAX_CONTEXT_CHARS) };
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
