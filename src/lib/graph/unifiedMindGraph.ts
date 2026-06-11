import { graphNodeValFromDegree } from "@/lib/journal/wikilinks";

export type MindNodeKind =
  | "entry"
  | "belief"
  | "artifact"
  | "entity"
  | "verse"
  | "claim";

export type MindGraphNode = {
  id: string;
  kind: MindNodeKind;
  label: string;
  color: string;
  val: number;
  /** Raw uuid or verse ref for navigation */
  ref: string;
  artifactKind?: string;
};

export type MindGraphLink = {
  source: string;
  target: string;
  relation: string;
  color: string;
};

/** Apple system-style accent colors (matches home-screen icon palette). */
export const MIND_NODE_COLORS: Record<MindNodeKind, string> = {
  entry: "#FF9500",
  belief: "#34C759",
  artifact: "#AF52DE",
  entity: "#FF3B30",
  verse: "#007AFF",
  claim: "#48484A",
};

const LINK_DEFAULT = "rgba(0, 122, 255, 0.22)";
const LINK_TENSION = "rgba(255, 59, 48, 0.45)";

export const mindNodeId = {
  entry: (id: string) => `e:${id}`,
  belief: (id: string) => `b:${id}`,
  artifact: (id: string) => `a:${id}`,
  entity: (id: string) => `k:${id}`,
  verse: (ref: string) => `v:${ref}`,
  claim: (id: string) => `c:${id}`,
} as const;

export type MindGraphFilters = {
  entry: boolean;
  belief: boolean;
  artifact: boolean;
  entity: boolean;
  verse: boolean;
  claim: boolean;
};

export const DEFAULT_MIND_GRAPH_FILTERS: MindGraphFilters = {
  entry: true,
  belief: true,
  artifact: true,
  entity: true,
  verse: true,
  claim: false,
};

export interface UnifiedMindGraphInput {
  entries: {
    id: string;
    title: string | null;
    body: string;
    summary: string | null;
    belief_id: string | null;
    verse_ref: string | null;
  }[];
  beliefs: { id: string; statement: string; topic: string }[];
  artifacts: { id: string; title: string | null; kind: string }[];
  entities: { id: string; title: string; kind: string }[];
  journalLinks: {
    entry_id: string;
    target_kind: string;
    target_ref: Record<string, unknown>;
  }[];
  beliefLinks: { a_id: string; b_id: string; relation: string }[];
  tensions: { a_id: string; b_id: string }[];
  beliefSources: { belief_id: string; artifact_id: string | null }[];
  claims: {
    id: string;
    claim: string;
    artifact_id: string;
    matched_belief_id: string | null;
  }[];
  scriptures: { belief_id: string; ref: string }[];
  entityMentions: {
    entity_id: string;
    journal_entry_id: string | null;
    artifact_id: string | null;
    belief_id: string | null;
  }[];
}

function refId(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function verseFromRef(obj: Record<string, unknown>): string | null {
  if (typeof obj.ref === "string" && obj.ref.trim()) return obj.ref.trim();
  const book = obj.book;
  const chapter = obj.chapter;
  if (typeof book === "string" && chapter != null) {
    const verses = Array.isArray(obj.verses) ? obj.verses.join("-") : "";
    return verses ? `${book} ${chapter}:${verses}` : `${book} ${chapter}`;
  }
  return null;
}

function addEdge(
  edges: MindGraphLink[],
  seen: Set<string>,
  source: string,
  target: string,
  relation: string,
  color = LINK_DEFAULT,
) {
  if (!source || !target || source === target) return;
  const key = `${source}|${target}|${relation}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ source, target, relation, color });
}

function bump(degree: Map<string, number>, id: string) {
  degree.set(id, (degree.get(id) ?? 0) + 1);
}

/** Build the full mind graph from normalized rows. */
export function buildUnifiedMindGraph(
  input: UnifiedMindGraphInput,
  filters: MindGraphFilters = DEFAULT_MIND_GRAPH_FILTERS,
): { nodes: MindGraphNode[]; links: MindGraphLink[] } {
  const nodeMap = new Map<string, MindGraphNode>();
  const edges: MindGraphLink[] = [];
  const edgeSeen = new Set<string>();
  const degree = new Map<string, number>();

  const ensure = (
    id: string,
    kind: MindNodeKind,
    label: string,
    ref: string,
    artifactKind?: string,
  ) => {
    if (!filters[kind]) return;
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        kind,
        label: label.slice(0, 80),
        color: MIND_NODE_COLORS[kind],
        val: 2,
        ref,
        artifactKind,
      });
    }
  };

  for (const e of input.entries) {
    if (!filters.entry) continue;
    const id = mindNodeId.entry(e.id);
    const label =
      e.title?.trim() ||
      e.summary?.trim()?.slice(0, 60) ||
      e.body.trim().slice(0, 60) ||
      "Journal entry";
    ensure(id, "entry", label, e.id);
  }

  for (const b of input.beliefs) {
    const id = mindNodeId.belief(b.id);
    ensure(id, "belief", b.statement || b.topic || "Belief", b.id);
  }

  for (const a of input.artifacts) {
    const id = mindNodeId.artifact(a.id);
    ensure(id, "artifact", a.title?.trim() || "Artifact", a.id, a.kind);
  }

  for (const ent of input.entities) {
    const id = mindNodeId.entity(ent.id);
    ensure(id, "entity", ent.title, ent.id);
  }

  const link = (
    source: string,
    target: string,
    relation: string,
    color?: string,
  ) => {
    if (!nodeMap.has(source) || !nodeMap.has(target)) return;
    addEdge(edges, edgeSeen, source, target, relation, color);
    bump(degree, source);
    bump(degree, target);
  };

  for (const row of input.journalLinks) {
    const src = mindNodeId.entry(row.entry_id);
    const ref = row.target_ref ?? {};
    switch (row.target_kind) {
      case "entry": {
        const tid = refId(ref, "entry_id", "id");
        if (tid) link(src, mindNodeId.entry(tid), "links");
        break;
      }
      case "belief": {
        const tid = refId(ref, "belief_id", "id");
        if (tid) link(src, mindNodeId.belief(tid), "reflects");
        break;
      }
      case "artifact": {
        const tid = refId(ref, "id", "artifact_id");
        if (tid) link(src, mindNodeId.artifact(tid), "from");
        break;
      }
      case "entity": {
        const tid = refId(ref, "entity_id", "id");
        if (tid) link(src, mindNodeId.entity(tid), "mentions");
        break;
      }
      case "verse": {
        const vref = verseFromRef(ref);
        if (vref) {
          const vid = mindNodeId.verse(vref);
          ensure(vid, "verse", vref, vref);
          link(src, vid, "scripture");
        }
        break;
      }
      default:
        break;
    }
  }

  for (const e of input.entries) {
    const src = mindNodeId.entry(e.id);
    if (e.belief_id) link(src, mindNodeId.belief(e.belief_id), "belief");
    if (e.verse_ref?.trim()) {
      const vid = mindNodeId.verse(e.verse_ref.trim());
      ensure(vid, "verse", e.verse_ref.trim(), e.verse_ref.trim());
      link(src, vid, "scripture");
    }
  }

  for (const bl of input.beliefLinks) {
    link(
      mindNodeId.belief(bl.a_id),
      mindNodeId.belief(bl.b_id),
      bl.relation || "related",
    );
  }

  for (const t of input.tensions) {
    link(
      mindNodeId.belief(t.a_id),
      mindNodeId.belief(t.b_id),
      "tension",
      LINK_TENSION,
    );
  }

  for (const s of input.beliefSources) {
    if (s.artifact_id) {
      link(
        mindNodeId.belief(s.belief_id),
        mindNodeId.artifact(s.artifact_id),
        "influenced by",
      );
    }
  }

  for (const sc of input.scriptures) {
    const vid = mindNodeId.verse(sc.ref);
    ensure(vid, "verse", sc.ref, sc.ref);
    link(mindNodeId.belief(sc.belief_id), vid, "scripture");
  }

  for (const m of input.entityMentions) {
    const ent = mindNodeId.entity(m.entity_id);
    if (m.journal_entry_id) link(mindNodeId.entry(m.journal_entry_id), ent, "mentions");
    if (m.artifact_id) link(mindNodeId.artifact(m.artifact_id), ent, "mentions");
    if (m.belief_id) link(mindNodeId.belief(m.belief_id), ent, "mentions");
  }

  if (filters.claim) {
    for (const c of input.claims) {
      const cid = mindNodeId.claim(c.id);
      ensure(cid, "claim", c.claim, c.id);
      link(cid, mindNodeId.artifact(c.artifact_id), "claim");
      if (c.matched_belief_id) {
        link(cid, mindNodeId.belief(c.matched_belief_id), c.claim.slice(0, 24));
      }
    }
  } else {
    for (const c of input.claims) {
      if (!c.matched_belief_id) continue;
      link(
        mindNodeId.artifact(c.artifact_id),
        mindNodeId.belief(c.matched_belief_id),
        "teaches",
      );
    }
  }

  const nodes = [...nodeMap.values()].map((n) => ({
    ...n,
    val: graphNodeValFromDegree(degree.get(n.id) ?? 0),
  }));

  return { nodes, links: edges };
}

/** Keep only nodes reachable from scoped journal entries (plus edges between them). */
export function pruneMindGraphToEntryRoots(
  graph: { nodes: MindGraphNode[]; links: MindGraphLink[] },
  entryIds: string[],
): { nodes: MindGraphNode[]; links: MindGraphLink[] } {
  if (!entryIds.length) return graph;
  const roots = new Set(entryIds.map((id) => mindNodeId.entry(id)));
  const adj = new Map<string, Set<string>>();
  for (const l of graph.links) {
    if (!adj.has(l.source)) adj.set(l.source, new Set());
    if (!adj.has(l.target)) adj.set(l.target, new Set());
    adj.get(l.source)!.add(l.target);
    adj.get(l.target)!.add(l.source);
  }
  const keep = new Set<string>();
  const queue = [...roots].filter((r) => graph.nodes.some((n) => n.id === r));
  for (const id of queue) keep.add(id);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of adj.get(cur) ?? []) {
      if (keep.has(nb)) continue;
      keep.add(nb);
      queue.push(nb);
    }
  }
  return {
    nodes: graph.nodes.filter((n) => keep.has(n.id)),
    links: graph.links.filter((l) => keep.has(l.source) && keep.has(l.target)),
  };
}

/** Route target for a graph node click. */
export function mindNodeRoute(node: MindGraphNode): string {
  switch (node.kind) {
    case "entry":
      return `/journal/${node.ref}`;
    case "belief":
      return `/framework/beliefs/${node.ref}`;
    case "artifact":
      return `/framework/artifacts/${node.ref}`;
    case "entity":
      return `/framework/influences`;
    case "verse": {
      const m = node.ref.match(/^(\S+)\s+(\d+)/);
      if (m) {
        const book = m[1].toLowerCase();
        const ch = m[2];
        return `/read/${book}/${ch}`;
      }
      return "/";
    }
    case "claim":
      return `/framework/artifacts`;
    default:
      return "/framework/graph";
  }
}
