import { useMemo } from "react";
import type { Json } from "@/integrations/supabase/types";
import { parseArtifactFrameworkOverview, type ArtifactFrameworkOverview } from "@/lib/framework/artifactOverviewSummary";

export function useArtifactFrameworkOverview(
  metadata: Json | null | undefined,
): ArtifactFrameworkOverview | null {
  return useMemo(() => parseArtifactFrameworkOverview(metadata), [metadata]);
}
