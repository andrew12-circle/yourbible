import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const MAX_CONTEXT_CHARS = 12_000;
const BODY_PREVIEW = 600;

const STOPWORDS = new Set([
  "that", "this", "with", "from", "your", "have", "what", "when", "where", "which", "their", "there", "about",
  "would", "could", "should", "because", "think", "really", "just", "into", "than", "then", "them", "some",
  "will", "been", "were", "they", "like", "also", "very", "more", "most", "other", "only", "such", "make",
  "does", "doesn", "did", "doesn", "don", "does", "each", "much", "even", "well", "want", "need", "know",
  "help", "please", "tell", "give", "how", "why", "who", "and", "but", "for", "not", "you", "are",
  "was", "the", "can", "has", "had", "his", "her", "our", "out", "all", "any", "get", "got", "may", "way",
]);

export type RetrievedContextPack = {
  contextBlock: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function tokenizeForSearch(message: string): string[] {
  const raw = message.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
  return raw.filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

function countTokenHits(text: string, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = text.toLowerCase();
  let n = 0;
  for (const t of tokens) {
    if (hay.includes(t)) n += 1;
  }
  return n;
}

function truncateChars(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function artifactMetaLine(meta: unknown): string {
  if (!isRecord(meta)) return "";
  const title = asTrimmedString(meta.title);
  const channel =
    asTrimmedString(meta.channel) ||
    asTrimmedString(meta.channel_title) ||
    asTrimmedString(meta.channelTitle);
  const bits = [title, channel].filter(Boolean);
  return bits.join(" · ");
}

type BeliefRow = {
  id: string;
  statement: string;
  layer: string;
  topic: string;
  created_at: string;
};

type SourceRow = {
  id: string;
  source_type: string;
  label: string;
};

type JournalRow = {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string;
};

type ArtifactRow = {
  id: string;
  title: string | null;
  kind: string;
  metadata: unknown;
};

type EntityRow = {
  id: string;
  title: string;
  kind: string;
  subtitle: string | null;
};

type HistoryRow = {
  role: string;
  content: string;
};

function sortLinesByTokens(lines: string[], tokens: string[]): string[] {
  if (!tokens.length) return lines;
  return [...lines].sort((a, b) => countTokenHits(b, tokens) - countTokenHits(a, tokens));
}

function shrinkToLimit(parts: string[], max: number): string {
  let body = parts.join("\n\n");
  if (body.length <= max) return body;

  const priorities = [...parts];
  let working = priorities.join("\n\n");
  let safety = 0;
  while (working.length > max && safety < 40) {
    safety += 1;
    // Drop from the end of the lowest-priority chunk (last section first).
    const lastIdx = priorities.length - 1;
    if (lastIdx <= 2) {
      working = truncateChars(working, max);
      break;
    }
    const tail = priorities[lastIdx] ?? "";
    if (tail.length > 400) {
      priorities[lastIdx] = tail.slice(0, Math.max(200, Math.floor(tail.length * 0.75))) + "…\n(truncated)";
    } else {
      priorities.pop();
    }
    working = priorities.join("\n\n");
  }
  if (working.length > max) working = truncateChars(working, max);
  return working;
}

export async function buildFrameworkRetrievalContext(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  userMessage: string,
): Promise<RetrievedContextPack> {
  const tokens = tokenizeForSearch(userMessage);

  const [
    profileRes,
    versionsRes,
    sourcesRes,
    journalsRes,
    artifactsRes,
    entitiesRes,
    historyRes,
  ] = await Promise.all([
    supabase.from("profiles").select("identity_summary").eq("user_id", userId).maybeSingle(),
    supabase
      .from("belief_versions")
      .select("created_at, belief_id, belief_nodes(id, statement, layer, topic)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("belief_sources")
      .select("id, source_type, label, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("journal_entries")
      .select("id, title, body, entry_at_ts")
      .eq("user_id", userId)
      // Vents are private — the AI must not see them.
      .or("entry_kind.is.null,entry_kind.neq.vent")
      .order("entry_at_ts", { ascending: false })
      .limit(8),
    supabase
      .from("artifacts")
      .select("id, title, kind, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("knowledge_entities")
      .select("id, title, kind, subtitle, last_seen_at")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(12),
    supabase
      .from("my_ai_messages")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (versionsRes.error) throw new Error(versionsRes.error.message);
  if (sourcesRes.error) throw new Error(sourcesRes.error.message);
  if (journalsRes.error) throw new Error(journalsRes.error.message);
  if (artifactsRes.error) throw new Error(artifactsRes.error.message);
  if (entitiesRes.error) throw new Error(entitiesRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);

  const identitySummary = profileRes.data?.identity_summary ?? null;

  const beliefSeen = new Map<string, BeliefRow>();
  for (const row of versionsRes.data ?? []) {
    const r = row as {
      created_at: string;
      belief_id: string;
      belief_nodes: { id: string; statement: string; layer: string; topic: string } | null;
    };
    const node = r.belief_nodes;
    if (!node?.id) continue;
    if (beliefSeen.has(node.id)) continue;
    beliefSeen.set(node.id, {
      id: node.id,
      statement: node.statement,
      layer: node.layer,
      topic: node.topic,
      created_at: r.created_at,
    });
    if (beliefSeen.size >= 20) break;
  }
  const beliefs = [...beliefSeen.values()];

  const sourceRowsAll = (sourcesRes.data ?? []) as SourceRow[];
  const sources: SourceRow[] = [];
  const sourceSeen = new Set<string>();
  for (const s of sourceRowsAll) {
    const key = `${s.source_type.toLowerCase()}::${s.label.trim().toLowerCase()}`;
    if (sourceSeen.has(key)) continue;
    sourceSeen.add(key);
    sources.push(s);
    if (sources.length >= 15) break;
  }

  const journals = (journalsRes.data ?? []) as JournalRow[];
  const artifacts = (artifactsRes.data ?? []) as ArtifactRow[];
  const entities = (entitiesRes.data ?? []) as EntityRow[];
  const historyAsc = ([...(historyRes.data ?? [])] as HistoryRow[]).reverse();

  const identityJson = identitySummary != null
    ? truncateChars(JSON.stringify(identitySummary), 3500)
    : "(none — identity summary not generated yet)";

  const beliefLinesRaw = beliefs.map((b) => {
    const line =
      `[belief:${b.id}] (${b.layer}) ${b.topic}: ${truncateChars(b.statement, 520)} (version touch: ${b.created_at})`;
    return line;
  });
  const beliefLines = sortLinesByTokens(beliefLinesRaw, tokens);

  const sourceLines = sources.map((s) => `[influence:${s.id}] ${s.label} (${s.source_type})`);

  const journalLinesRaw = journals.map((j) => {
    const title = j.title?.trim() || "(untitled)";
    const day = j.entry_at_ts.slice(0, 10);
    const body = truncateChars(j.body.replace(/\s+/g, " ").trim(), BODY_PREVIEW);
    return `[journal:${j.id}] ${day} — ${title}: ${body}`;
  });
  const journalLines = sortLinesByTokens(journalLinesRaw, tokens);

  const artifactLinesRaw = artifacts.map((a) => {
    const t = a.title?.trim() || "(untitled)";
    const meta = artifactMetaLine(a.metadata);
    const metaBit = meta ? ` | ${meta}` : "";
    return `[artifact:${a.id}] ${a.kind} — "${t}"${metaBit}`;
  });
  const artifactLines = sortLinesByTokens(artifactLinesRaw, tokens);

  const entityLinesRaw = entities.map((e) => {
    const sub = e.subtitle?.trim() ? ` — ${e.subtitle}` : "";
    return `[entity:${e.id}] (${e.kind}) ${e.title}${sub}`;
  });
  const entityLines = sortLinesByTokens(entityLinesRaw, tokens);

  const historyBlock = historyAsc
    .map((h) => `${h.role.toUpperCase()}: ${truncateChars(h.content.replace(/\s+/g, " ").trim(), 900)}`)
    .join("\n");

  const sections: string[] = [
    "## Identity summary (profiles.identity_summary)\n" + identityJson,
    "## Current beliefs (cite with [belief:uuid])\n" + (beliefLines.length ? beliefLines.join("\n") : "(none)"),
    "## Influences / sources (belief_sources)\n" + (sourceLines.length ? sourceLines.join("\n") : "(none)"),
    "## Recent journals\n" + (journalLines.length ? journalLines.join("\n") : "(none)"),
    "## Recent artifacts\n" + (artifactLines.length ? artifactLines.join("\n") : "(none)"),
    "## Knowledge entities\n" + (entityLines.length ? entityLines.join("\n") : "(none)"),
    "## This chat (most recent messages, oldest → newest within window)\n" + (historyBlock || "(empty)"),
  ];

  const contextBlock = shrinkToLimit(sections, MAX_CONTEXT_CHARS);

  return { contextBlock };
}

type PartnerPeerRpcRow = {
  connection_id: string;
  peer_user_id: string;
  peer_display_name: string | null;
  peer_email: string | null;
};

/** Privacy-safe partner digest for My AI — never reads partner journals or beliefs. */
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
  for (const p of (peerRows ?? []) as PartnerPeerRpcRow[]) {
    peers.set(p.connection_id, p);
  }

  const blocks: string[] = [];
  for (const row of conns as { id: string; user_a: string; user_b: string }[]) {
    const partnerId = row.user_a === userId ? row.user_b : row.user_a;
    const peer = peers.get(row.id);
    const label =
      peer?.peer_display_name?.trim() ||
      peer?.peer_email?.split("@")[0] ||
      "Partner";

    const { data: sum, error: sErr } = await supabase
      .from("partner_summaries")
      .select("summary,recent_themes,prayer_points,season_label")
      .eq("connection_id", row.id)
      .eq("owner_user_id", partnerId)
      .maybeSingle();
    if (sErr) continue;

    if (!sum?.summary?.trim()) {
      blocks.push(`### Walking with ${label}\n(Partner summary not generated yet.)`);
      continue;
    }
    const themes = Array.isArray(sum.recent_themes) && sum.recent_themes.length
      ? sum.recent_themes.join(", ")
      : "(none listed)";
    const prayers = Array.isArray(sum.prayer_points) && sum.prayer_points.length
      ? sum.prayer_points.map((x: string) => `- ${x}`).join("\n")
      : "(none shared / hidden)";
    blocks.push(
      `### Walking with ${label}\n- Season: ${String(sum.season_label || "unspecified")}\n- Summary: ${String(sum.summary)}\n- Themes: ${themes}\n- Prayer points:\n${prayers}`,
    );
  }

  if (!blocks.length) return "";
  return blocks.join("\n\n");
}
