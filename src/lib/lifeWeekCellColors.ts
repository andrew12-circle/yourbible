/** Vibrant life-grid palette — no two orthogonally adjacent cells share a color. */

export const LIFE_WEEK_PALETTE = [
  "#2563EB", // blue
  "#16A34A", // green
  "#DC2626", // red
  "#EAB308", // yellow
  "#9333EA", // purple
  "#EC4899", // pink
  "#F97316", // orange
] as const;

const UNASSIGNED = 255;

const colorMapCache = new Map<string, Uint8Array>();

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(order: number[], rng: () => number): void {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
}

/** Stable seed per person so their mosaic pattern does not shift between renders. */
export function lifeWeekColorSeed(birthDate: string, scope = "life-weeks"): string {
  return `${scope}:${birthDate.trim()}`;
}

/**
 * Greedy graph coloring in seeded-random visit order.
 * 7 colors suffice for a 52-column week grid with orthogonal adjacency.
 */
export function buildLifeWeekColorMap(
  colorSeed: string,
  totalCells: number,
  cols: number,
): Uint8Array {
  const cacheKey = `${colorSeed}|${totalCells}|${cols}`;
  const cached = colorMapCache.get(cacheKey);
  if (cached) return cached;

  const rows = Math.ceil(totalCells / cols);
  const colors = new Uint8Array(totalCells);
  colors.fill(UNASSIGNED);

  const rng = createRng(hashString(colorSeed));
  const order = Array.from({ length: totalCells }, (_, i) => i);
  shuffleInPlace(order, rng);

  for (const i of order) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const banned = new Set<number>();

    if (col > 0) {
      const left = colors[i - 1];
      if (left !== UNASSIGNED) banned.add(left);
    }
    if (col < cols - 1 && i + 1 < totalCells) {
      const right = colors[i + 1];
      if (right !== UNASSIGNED) banned.add(right);
    }
    if (row > 0) {
      const up = colors[i - cols];
      if (up !== UNASSIGNED) banned.add(up);
    }
    if (row < rows - 1 && i + cols < totalCells) {
      const down = colors[i + cols];
      if (down !== UNASSIGNED) banned.add(down);
    }

    const available: number[] = [];
    for (let c = 0; c < LIFE_WEEK_PALETTE.length; c++) {
      if (!banned.has(c)) available.push(c);
    }

    const pick = available[Math.floor(rng() * available.length)] ?? i % LIFE_WEEK_PALETTE.length;
    colors[i] = pick;
  }

  colorMapCache.set(cacheKey, colors);
  return colors;
}

export function lifeWeekColorAt(colorMap: Uint8Array, index: number): string {
  const idx = colorMap[index] ?? 0;
  return LIFE_WEEK_PALETTE[idx % LIFE_WEEK_PALETTE.length] ?? LIFE_WEEK_PALETTE[0];
}

export function neighborIndices(index: number, totalCells: number, cols: number): number[] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const rows = Math.ceil(totalCells / cols);
  const neighbors: number[] = [];

  if (col > 0) neighbors.push(index - 1);
  if (col < cols - 1 && index + 1 < totalCells) neighbors.push(index + 1);
  if (row > 0) neighbors.push(index - cols);
  if (row < rows - 1 && index + cols < totalCells) neighbors.push(index + cols);

  return neighbors;
}

/** @internal Test helper — verify orthogonal neighbors differ. */
export function lifeWeekColorMapHasNoAdjacentDuplicates(
  colorMap: Uint8Array,
  totalCells: number,
  cols: number,
): boolean {
  for (let i = 0; i < totalCells; i++) {
    for (const n of neighborIndices(i, totalCells, cols)) {
      if (colorMap[i] === colorMap[n]) return false;
    }
  }
  return true;
}
