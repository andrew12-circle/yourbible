import { useCallback, useEffect, useRef, useState } from "react";
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

type EnrichNameResult = {
  name: string;
  ok: boolean;
  avatar_url?: string;
  detail?: string;
};

type EnrichNameBulkResponse = {
  ok: boolean;
  error?: string;
  name_results?: EnrichNameResult[];
};

function normalizeCastKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Background-fetch images for knowledge entities missing avatar_url.
 * People: Wikipedia → DuckDuckGo → AI portrait. Themes/books: covers → AI art.
 */
export function useKnowledgeEntityAvatarEnrichment(
  entityIds: string[],
  options?: { artifactHint?: string; enabled?: boolean; onEnriched?: () => void },
) {
  const attemptedRef = useRef(new Set<string>());
  const onEnriched = options?.onEnriched;
  const artifactHint = options?.artifactHint;
  const enabled = options?.enabled ?? true;

  const enrichMissing = useCallback(async () => {
    const pending = entityIds.filter((id) => !attemptedRef.current.has(id)).slice(0, MAX_AUTO_ENRICH);
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
  }, [artifactHint, onEnriched, entityIds]);

  useEffect(() => {
    if (!enabled || entityIds.length === 0) return;
    void enrichMissing();
  }, [enabled, enrichMissing, entityIds.length]);
}

/**
 * Fetch profile photos for cast members listed by name only (no linked entity row).
 */
export function useCastNameAvatarEnrichment(
  names: string[],
  options?: { artifactHint?: string; enabled?: boolean },
): Record<string, string> {
  const attemptedRef = useRef(new Set<string>());
  const [avatarByName, setAvatarByName] = useState<Record<string, string>>({});
  const artifactHint = options?.artifactHint;
  const enabled = options?.enabled ?? true;

  const enrichMissing = useCallback(async () => {
    const pending = names
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && !attemptedRef.current.has(normalizeCastKey(n)))
      .slice(0, MAX_AUTO_ENRICH);
    if (pending.length === 0) return;

    for (const name of pending) attemptedRef.current.add(normalizeCastKey(name));

    const { data, error } = await supabase.functions.invoke("framework-enrich-entity", {
      body: {
        cast_names: pending,
        ...(artifactHint ? { artifact_hint: artifactHint } : {}),
      },
    });

    if (error) return;

    const payload = data as EnrichNameBulkResponse;
    if (!payload?.ok || !Array.isArray(payload.name_results)) return;

    setAvatarByName((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const row of payload.name_results ?? []) {
        const url = row.avatar_url?.trim();
        if (!url) continue;
        const key = normalizeCastKey(row.name);
        if (next[key]) continue;
        next[key] = url;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [artifactHint, names]);

  useEffect(() => {
    if (!enabled || names.length === 0) return;
    void enrichMissing();
  }, [enabled, enrichMissing, names.length]);

  return avatarByName;
}
