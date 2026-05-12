type Edge = { a: string; b: string };

function linkEndpoints(source: unknown, target: unknown): Edge | null {
  const sid = typeof source === "object" && source && "id" in (source as object)
    ? String((source as { id: string }).id)
    : String(source);
  const tid = typeof target === "object" && target && "id" in (target as object)
    ? String((target as { id: string }).id)
    : String(target);
  if (!sid || !tid) return null;
  return { a: sid, b: tid };
}

/** Undirected adjacency from force-graph links (resolves source/target objects). */
export function buildAdjacency(
  links: { source: unknown; target: unknown }[],
): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  const add = (u: string, v: string) => {
    if (!m.has(u)) m.set(u, new Set());
    m.get(u)!.add(v);
  };
  for (const l of links) {
    const e = linkEndpoints(l.source, l.target);
    if (!e) continue;
    add(e.a, e.b);
    add(e.b, e.a);
  }
  return m;
}

/** BFS N-hop neighborhood (includes center). */
export function nHopNeighborSet(centerId: string, adj: Map<string, Set<string>>, depth: number): Set<string> {
  const out = new Set<string>([centerId]);
  if (depth < 1) return out;
  let frontier = new Set<string>([centerId]);
  for (let hop = 0; hop < depth; hop++) {
    const next = new Set<string>();
    for (const u of frontier) {
      for (const v of adj.get(u) ?? []) {
        if (!out.has(v)) {
          out.add(v);
          next.add(v);
        }
      }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }
  return out;
}
