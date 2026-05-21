import type { Json } from "@/integrations/supabase/types";

export type ArtifactRow = {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  error: string | null;
  raw_text: string;
  url?: string | null;
  metadata?: Json | null;
};

export function artifactRowStableEqual(prev: ArtifactRow | null, next: ArtifactRow | null): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.id !== next.id) return false;
  return (
    prev.status === next.status &&
    prev.error === next.error &&
    prev.raw_text === next.raw_text &&
    prev.title === next.title &&
    prev.kind === next.kind &&
    prev.url === next.url &&
    JSON.stringify(prev.metadata ?? null) === JSON.stringify(next.metadata ?? null)
  );
}
