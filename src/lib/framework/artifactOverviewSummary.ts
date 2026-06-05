import type { Json } from "@/integrations/supabase/types";

export interface ArtifactFrameworkOverview {
  summary: string;
  key_points: string[];
  framework_alignment: {
    aligns: string[];
    conflicts: string[];
    new_ground: string[];
  };
  generated_at: string;
}

function sanitizeStringList(raw: unknown, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (!s) continue;
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function parseArtifactFrameworkOverview(metadata: Json | null | undefined): ArtifactFrameworkOverview | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const raw = (metadata as Record<string, unknown>).framework_overview;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  if (!summary) return null;
  const key_points = sanitizeStringList(o.key_points, 6);
  if (key_points.length === 0) return null;
  const fa = (o.framework_alignment ?? {}) as Record<string, unknown>;
  const generated_at = typeof o.generated_at === "string" ? o.generated_at : "";
  return {
    summary,
    key_points,
    framework_alignment: {
      aligns: sanitizeStringList(fa.aligns, 4),
      conflicts: sanitizeStringList(fa.conflicts, 4),
      new_ground: sanitizeStringList(fa.new_ground, 4),
    },
    generated_at,
  };
}
