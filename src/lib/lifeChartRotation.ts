export type LifeChartSlot = "self" | "lilly" | "caroline";

const ROTATION_KEY = "yb_life_chart_rotation_v1";

export function readStoredChartSlot(): LifeChartSlot | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ROTATION_KEY);
  if (raw === "self" || raw === "lilly" || raw === "caroline") return raw;
  return null;
}

export function writeStoredChartSlot(slot: LifeChartSlot): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ROTATION_KEY, slot);
}

/** Advance to the next available slot (screensaver-style) and persist for this session. */
export function advanceChartSlot(available: LifeChartSlot[]): LifeChartSlot {
  if (available.length === 0) return "self";
  const prev = readStoredChartSlot();
  const prevIdx = prev ? available.indexOf(prev) : -1;
  const nextIdx = prevIdx >= 0 ? (prevIdx + 1) % available.length : 0;
  const next = available[nextIdx] ?? available[0];
  writeStoredChartSlot(next);
  return next;
}

export function chartSlotLabel(slot: LifeChartSlot, displayName?: string | null): string {
  if (slot === "self") return displayName?.trim() ? displayName.trim() : "You";
  if (slot === "lilly") return "Lilly";
  return "Caroline";
}
