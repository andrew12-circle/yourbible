import type { MindGraphLink, MindGraphNode, MindNodeKind } from "./unifiedMindGraph";

export type MindSpaceGraph = { nodes: MindGraphNode[]; links: MindGraphLink[] };
export type MindSpaceIndex = ReturnType<typeof indexMindSpace>;
export const MIND_SPACE_KINDS: { kind: MindNodeKind; label: string; color: string }[] = [
  { kind: "entry", label: "Journal", color: "#69caff" },
  { kind: "belief", label: "Beliefs", color: "#7be4c1" },
  { kind: "verse", label: "Scripture", color: "#d4c0ff" },
  { kind: "artifact", label: "Sources", color: "#ffcf91" },
  { kind: "entity", label: "People & topics", color: "#ff9fb5" },
  { kind: "claim", label: "Claims", color: "#bcc9e9" },
];
export const spaceKind = (kind: MindNodeKind) => MIND_SPACE_KINDS.find((item) => item.kind === kind)!;
export const spaceLinkId = (link: MindGraphLink) => JSON.stringify([link.source, link.target, link.relation]);

/** Never give canonical graph objects to a renderer that may mutate them. */
export function indexMindSpace(graph: MindSpaceGraph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, { ...node }]));
  const adjacency = new Map<string, { id: string; link: MindGraphLink }[]>();
  const unique = new Map<string, MindGraphLink>();
  for (const link of graph.links) {
    if (link.source === link.target || !nodes.has(link.source) || !nodes.has(link.target)) continue;
    unique.set(spaceLinkId(link), { ...link });
  }
  const links = [...unique.values()];
  for (const link of links) {
    adjacency.set(link.source, [...(adjacency.get(link.source) ?? []), { id: link.target, link }]);
    adjacency.set(link.target, [...(adjacency.get(link.target) ?? []), { id: link.source, link }]);
  }
  const degree = (id: string) => new Set((adjacency.get(id) ?? []).map((edge) => edge.id)).size;
  const rank = (a: string, b: string) => degree(b) - degree(a) || a.localeCompare(b);
  const ranked = [...nodes.keys()].sort(rank);
  for (const edges of adjacency.values()) edges.sort((a, b) => rank(a.id, b.id));
  return { nodes, links, adjacency, ranked, degree };
}

/** Browse saved links in either direction. A path is not evidence of agreement or causation. */
export function traceMindSpace(index: MindSpaceIndex, from: string, to: string) {
  if (!index.nodes.has(from) || !index.nodes.has(to)) return null;
  const parents = new Map<string, { id: string; link: MindGraphLink }>();
  const queue = [from];
  const visited = new Set(queue);
  for (let cursor = 0; cursor < queue.length && !visited.has(to); cursor += 1) {
    const id = queue[cursor];
    for (const edge of index.adjacency.get(id) ?? []) {
      if (visited.has(edge.id)) continue;
      visited.add(edge.id);
      parents.set(edge.id, { id, link: edge.link });
      queue.push(edge.id);
    }
  }
  if (!visited.has(to)) return null;
  const ids = [to], links: MindGraphLink[] = [];
  while (ids[0] !== from) {
    const parent = parents.get(ids[0])!;
    links.unshift(parent.link);
    ids.unshift(parent.id);
  }
  return { ids, links };
}

export function defaultMindSpaceFocus(index: MindSpaceIndex): string | null {
  return index.ranked.find((id) => index.nodes.get(id)?.kind === "entry" && index.degree(id) > 0)
    ?? index.ranked[0] ?? null;
}

/** Depth is relational distance, not visual proximity. Cap the scene, not search or the underlying graph. */
export function selectMindSpace(
  index: MindSpaceIndex, focus: string | null, depth: number, limit = 48, traceTarget: string | null = null,
) {
  const distances = new Map<string, number>();
  if (focus && index.nodes.has(focus)) {
    const queue = [focus]; distances.set(focus, 0);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const id = queue[cursor], distance = distances.get(id)!;
      if (depth > 0 && distance >= depth) continue;
      for (const edge of index.adjacency.get(id) ?? []) {
        if (distances.has(edge.id)) continue;
        distances.set(edge.id, distance + 1); queue.push(edge.id);
      }
    }
  }
  const candidates = depth === 0 ? index.ranked : [...distances.keys()];
  const trace = focus && traceTarget ? traceMindSpace(index, focus, traceTarget) : null;
  // Very long paths can be explored in the panel without removing the renderer's hard bound.
  const bound = Math.max(1, Math.min(80, Math.floor(limit)));
  const ids = new Set<string>([...(focus && index.nodes.has(focus) ? [focus] : []), ...(trace?.ids ?? [])].slice(0, bound));
  for (const id of candidates) { if (ids.size >= bound) break; ids.add(id); }
  const nodes = [...ids].map((id) => index.nodes.get(id)!).filter(Boolean);
  const allLinks = index.links.filter((link) => ids.has(link.source) && ids.has(link.target));
  const traceKeys = new Set(trace?.links.map(spaceLinkId) ?? []);
  // Preserve traced links first when a dense cluster exceeds the line budget.
  const links = [...allLinks].sort((a, b) => Number(traceKeys.has(spaceLinkId(b))) - Number(traceKeys.has(spaceLinkId(a)))).slice(0, 160);
  return { nodes, links, distances, trace, total: candidates.length, hiddenLinks: allLinks.length - links.length };
}

export function searchMindSpace(index: MindSpaceIndex, query: string): MindGraphNode[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return index.ranked.map((id) => index.nodes.get(id)!).filter((node) => {
    const haystack = `${node.label} ${node.detail ?? ""} ${spaceKind(node.kind).label}`.toLocaleLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
