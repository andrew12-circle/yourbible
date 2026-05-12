export type RadialNodeInput = {
  id: string;
  kind: "belief" | "claim";
  /** Matched belief graph id `b:uuid` for claims */
  beliefAnchorId?: string;
};

/**
 * Pinned graph coordinates for a radial mind-map layout centered on `centerId`.
 * Claims are placed just outside their matched belief.
 */
export function computeRadialPins(
  centerId: string,
  nodes: RadialNodeInput[],
  links: { source: unknown; target: unknown }[],
  opts?: { radiusStep?: number; claimOffset?: number },
): Map<string, { fx: number; fy: number }> {
  const radiusStep = opts?.radiusStep ?? 140;
  const claimOffset = opts?.claimOffset ?? 36;
  const adj = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  const res = (s: unknown, t: unknown) => {
    const sid = typeof s === "object" && s && "id" in (s as object) ? String((s as { id: string }).id) : String(s);
    const tid = typeof t === "object" && t && "id" in (t as object) ? String((t as { id: string }).id) : String(t);
    add(sid, tid);
  };
  for (const l of links) res(l.source, l.target);

  const pos = new Map<string, { fx: number; fy: number }>();
  if (!nodes.some((n) => n.id === centerId)) return pos;

  const depth = new Map<string, number>();
  const q: string[] = [centerId];
  depth.set(centerId, 0);
  while (q.length) {
    const u = q.shift()!;
    const du = depth.get(u)!;
    for (const v of adj.get(u) ?? []) {
      if (!depth.has(v)) {
        depth.set(v, du + 1);
        q.push(v);
      }
    }
  }

  const byDepth = new Map<number, RadialNodeInput[]>();
  for (const n of nodes) {
    if (n.kind === "claim") continue;
    let d = depth.get(n.id);
    if (d === undefined) {
      const fallbackRing = Math.max(...depth.values(), 0) + 1;
      d = fallbackRing;
      depth.set(n.id, d);
    }
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n);
  }

  pos.set(centerId, { fx: 0, fy: 0 });

  const depthsSorted = [...byDepth.keys()].filter((d) => d > 0).sort((a, b) => a - b);
  for (const d of depthsSorted) {
    const arr = byDepth.get(d) ?? [];
    if (arr.length === 0) continue;
    const R = d * radiusStep;
    const nc = arr.length;
    arr.forEach((node, i) => {
      const angle = (i / nc) * Math.PI * 2 - Math.PI / 2;
      pos.set(node.id, { fx: Math.cos(angle) * R, fy: Math.sin(angle) * R });
    });
  }

  const beliefPos = (id: string) => pos.get(id) ?? { fx: 0, fy: 0 };

  for (const n of nodes) {
    if (n.kind !== "claim") continue;
    const anchor = n.beliefAnchorId;
    if (!anchor || !pos.has(anchor)) continue;
    const bp = beliefPos(anchor);
    const ang = Math.atan2(bp.fy, bp.fx);
    const br = Math.hypot(bp.fx, bp.fy) || radiusStep * 0.5;
    pos.set(n.id, {
      fx: Math.cos(ang) * (br + claimOffset),
      fy: Math.sin(ang) * (br + claimOffset),
    });
  }

  return pos;
}
