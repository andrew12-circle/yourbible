import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAX_AUTO_ENRICH = 8;

type EnrichEntityResult = {
  entity_id: string;
  ok: boolean;
  saved?: boolean;
  avatar_url?: string;
  error?: string;
  detail?: string;
};

type EnrichEntityBulkResponse = {
  ok: boolean;
  error?: string;
  results?: EnrichEntityResult[];
};

type EnrichEntitySingleResponse = {
  ok: boolean;
  saved?: boolean;
  entity_id?: string;
  avatar_url?: string;
  error?: string;
  detail?: string;
};

/**
 * Background-fetch profile photos for person entities missing avatar_url.
 * Calls framework-enrich-entity (Wikipedia → DuckDuckGo → Gemini).
 */
export function useKnowledgeEntityAvatarEnrichment(
  personEntityIds: string[],
  options?: { artifactHint?: string; enabled?: boolean; onEnriched?: () => void },
) {
  const attemptedRef = useRef(new Set<string>());
  const onEnriched = options?.onEnriched;
  const artifactHint = options?.artifactHint;
  const enabled = options?.enabled ?? true;

  const enrichMissing = useCallback(async () => {
    const pending = personEntityIds.filter((id) => !attemptedRef.current.has(id)).slice(0, MAX_AUTO_ENRICH);
    if (pending.length === 0) return;

    for (const id of pending) attemptedRef.current.add(id);

    const { data, error } = await supabase.functions.invoke("framework-enrich-entity", {
      body: {
        entity_ids: pending,
        ...(artifactHint ? { artifact_hint: artifactHint } : {}),
      },
    });

    if (error) return;

    const payload = data as EnrichEntityBulkResponse | EnrichEntitySingleResponse;
    if (!payload?.ok) return;

    const results =
      "results" in payload && Array.isArray(payload.results)
        ? payload.results
        : "entity_id" in payload && payload.entity_id
          ? [payload as EnrichEntityResult]
          : [];

    if (results.some((r) => r.saved && r.avatar_url)) {
      onEnriched?.();
    }
  }, [artifactHint, onEnriched, personEntityIds]);

  useEffect(() => {
    if (!enabled || personEntityIds.length === 0) return;
    void enrichMissing();
  }, [enabled, enrichMissing, personEntityIds.length]);
}
