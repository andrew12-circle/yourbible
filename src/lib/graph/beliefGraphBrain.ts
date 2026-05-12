export type BrainNodeInput = {
  id: string;
  kind: "belief" | "claim";
  /** Matched belief graph id `b:uuid` for claims */
  beliefAnchorId?: string;
};

function linkEndpoints(l: { source: unknown; target: unknown }): { sid: string; tid: string } {
  const sid =
    typeof l.source === "object" && l.source && "id" in (l.source as object)
      ? String((l.source as { id: string }).id)
      : String(l.source ?? "");
  const tid =
    typeof l.target === "object" && l.target && "id" in (l.target as object)
      ? String((l.target as { id: string }).id)
      : String(l.target ?? "");
  return { sid, tid };
}

function stableHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Greedy partition of belief nodes into two sides to reduce cross-lobe edges (heuristic).
 */
function partitionBeliefs(
  beliefIds: string[],
  links: { source: unknown; target: unknown }[],
): Map<string, 0 | 1> {
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  for (const l of links) {
    const { sid, tid } = linkEndpoints(l);
    if (!beliefIds.includes(sid) || !beliefIds.includes(tid)) continue;
    add(sid, tid);
  }

  const order = [...beliefIds].sort((a, b) => a.localeCompare(b));
  const side = new Map<string, 0 | 1>();

  for (const id of order) {
    let c0 = 0;
    let c1 = 0;
    for (const nb of adj.get(id) ?? []) {
      const s = side.get(nb);
      if (s === 0) c0++;
      else if (s === 1) c1++;
    }
    let s: 0 | 1;
    if (c0 < c1) s = 0;
    else if (c1 < c0) s = 1;
    else s = stableHash(id) % 2 === 0 ? 0 : 1;
    side.set(id, s);
  }
  return side;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function placeLobe(
  ids: string[],
  cx: number,
  a: number,
  b: number,
  out: Map<string, { x: number; y: number }>,
): void {
  const n = ids.length;
  if (n === 0) return;
  ids.forEach((id, i) => {
    const idx = i + 1;
    const r = Math.min(0.97, Math.sqrt(idx / Math.max(n, 1)));
    const theta = i * GOLDEN_ANGLE;
    const u = r * Math.cos(theta);
    const v = r * Math.sin(theta);
    out.set(id, { x: cx + a * u * 0.96, y: b * v * 0.96 });
  });
}

function scaleForCount(n: number): { D: number; a: number; b: number; claimOff: number } {
  const t = Math.max(1, n);
  const D = 110 + Math.sqrt(t) * 52;
  const a = 95 + Math.sqrt(t) * 34;
  const b = a * 1.38;
  const claimOff = 28 + Math.min(18, Math.sqrt(t) * 3);
  return { D, a, b, claimOff };
}

export type BrainPoint = { x: number; y: number };

/**
 * Target coordinates for each node (belief + claim): two vertically elongated lobes with a midline gap.
 */
export function computeBrainTargets(
  nodes: BrainNodeInput[],
  links: { source: unknown; target: unknown }[],
): Map<string, BrainPoint> {
  const out = new Map<string, BrainPoint>();
  const beliefs = nodes.filter((n) => n.kind === "belief");
  const beliefIds = beliefs.map((b) => b.id);
  const { D, a, b, claimOff } = scaleForCount(beliefIds.length);

  if (beliefIds.length === 0) {
    for (const n of nodes) {
      out.set(n.id, { x: 0, y: 0 });
    }
    return out;
  }

  if (beliefIds.length === 1) {
    out.set(beliefIds[0]!, { x: 0, y: 0 });
  } else {
    const side = partitionBeliefs(beliefIds, links);
    const left: string[] = [];
    const right: string[] = [];
    for (const id of beliefIds) {
      if (side.get(id) === 1) right.push(id);
      else left.push(id);
    }
    if (left.length === 0 && right.length > 0) {
      left.push(right.pop()!);
    }
    if (right.length === 0 && left.length > 0) {
      right.push(left.pop()!);
    }
    placeLobe(left, -D, a, b, out);
    placeLobe(right, D, a, b, out);
  }

  const beliefPt = (id: string) => out.get(id) ?? { x: 0, y: 0 };

  for (const n of nodes) {
    if (n.kind !== "claim") continue;
    const anchor = n.beliefAnchorId;
    if (!anchor) {
      out.set(n.id, { x: (stableHash(n.id) % 2 === 0 ? -1 : 1) * D * 0.35, y: 0 });
      continue;
    }
    const bp = beliefPt(anchor);
    const ang = Math.atan2(bp.y, bp.x);
    const jitter = ((stableHash(n.id) % 17) - 8) * 0.012;
    out.set(n.id, {
      x: bp.x + Math.cos(ang + jitter) * claimOff,
      y: bp.y + Math.sin(ang + jitter) * claimOff,
    });
  }

  return out;
}

/** Pinned coordinates for the explicit Brain layout preset. */
export function computeBrainPins(
  nodes: BrainNodeInput[],
  links: { source: unknown; target: unknown }[],
): Map<string, { fx: number; fy: number }> {
  const t = computeBrainTargets(nodes, links);
  const pins = new Map<string, { fx: number; fy: number }>();
  for (const [id, p] of t) pins.set(id, { fx: p.x, fy: p.y });
  return pins;
}

export type BrainBiasForce = ((alpha: number) => void) & {
  initialize: (
    ns: { id?: string; x?: number; y?: number; vx?: number; vy?: number; fx?: number; fy?: number }[],
  ) => void;
};

/**
 * Weak attraction toward brain targets; strength scales with zoom (smaller k => stronger macro shaping).
 */
export function createBrainBiasForce(
  targets: Map<string, BrainPoint>,
  getZoomK: () => number,
): BrainBiasForce {
  let simNodes: { id?: string; x?: number; y?: number; vx?: number; vy?: number; fx?: number; fy?: number }[] =
    [];

  const force = (alpha: number) => {
    const k = getZoomK();
    if (k >= 0.52) return;
    const zoomMul = Math.min(1, (0.52 - k) / 0.38);
    const coeff = 0.022 * zoomMul * alpha;
    if (coeff < 1e-6) return;

    for (const node of simNodes) {
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;
      if (node.fx != null || node.fy != null) continue;
      const id = String(node.id ?? "");
      const t = targets.get(id);
      if (!t) continue;
      node.vx = (node.vx ?? 0) + (t.x - node.x) * coeff;
      node.vy = (node.vy ?? 0) + (t.y - node.y) * coeff;
    }
  };

  force.initialize = (ns) => {
    simNodes = ns;
  };

  return force;
}
