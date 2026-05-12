/** Matches profiles.identity_summary JSON written by framework-generate-identity. */
export interface IdentitySummaryPayload {
  summary: string;
  markers: string[];
  voice: string;
  tags: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseIdentitySummaryPayload(raw: unknown): IdentitySummaryPayload | null {
  if (!isRecord(raw)) return null;
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const voice = typeof raw.voice === "string" ? raw.voice.trim() : "";
  if (!summary || !voice) return null;
  if (!Array.isArray(raw.markers) || !Array.isArray(raw.tags)) return null;
  const markers = raw.markers
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = raw.tags
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  if (markers.length === 0 || tags.length === 0) return null;
  return { summary, markers, voice, tags };
}
