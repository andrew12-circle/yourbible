import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronDown, ChevronUp, ExternalLink, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";

interface SourceRow {
  id: string;
  belief_id: string;
  source_type: string;
  label: string;
  avatar_url: string | null;
  metadata: Json;
}

interface BeliefRow {
  id: string;
  topic: string;
  statement: string;
  layer: string;
  confidence: number;
}

type EnrichSource = "wikipedia" | "duckduckgo" | "llm";

interface InfluenceMeta {
  bio?: string;
  source_url?: string;
  enrichment_source?: EnrichSource;
  enriched_at?: string;
}

interface InfluenceGroup {
  key: string;
  type: string;
  label: string;
  beliefIds: string[];
  sourceRowIds: string[];
  avatar_url: string | null;
  meta: InfluenceMeta;
}

interface EnrichResponse {
  avatar_url?: string;
  bio?: string;
  source_url?: string;
  source?: EnrichSource;
  error?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseInfluenceMeta(raw: Json): InfluenceMeta {
  if (!isRecord(raw)) return {};
  const bio = typeof raw.bio === "string" ? raw.bio.trim() : undefined;
  const source_url = typeof raw.source_url === "string" ? raw.source_url.trim() : undefined;
  const enriched_at = typeof raw.enriched_at === "string" ? raw.enriched_at : undefined;
  const enrichment_source =
    raw.enrichment_source === "wikipedia" ||
    raw.enrichment_source === "duckduckgo" ||
    raw.enrichment_source === "llm"
      ? raw.enrichment_source
      : undefined;
  return {
    ...(bio ? { bio } : {}),
    ...(source_url ? { source_url } : {}),
    ...(enrichment_source ? { enrichment_source } : {}),
    ...(enriched_at ? { enriched_at } : {}),
  };
}

function metaToJson(m: InfluenceMeta): Json {
  return m as Json;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function monogramGradient(name: string): string {
  const h = hashString(name.toLowerCase());
  const h1 = h % 360;
  const h2 = (h1 + 48) % 360;
  return `linear-gradient(135deg, hsl(${h1} 42% 38%), hsl(${h2} 46% 28%))`;
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function scopeLabel(sourceType: string): string {
  const t = sourceType.toLowerCase();
  if (t === "mentor") return "Person";
  if (t === "denomination") return "Church";
  if (t === "podcast") return "Podcast";
  if (t === "scripture") return "Scripture";
  if (t === "experience") return "Experience";
  if (t === "book") return "Book";
  return sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
}

const ENRICH_GAP_MS = 550;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export default function InfluencesPage() {
  const { user, loading } = useAuth();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [beliefs, setBeliefs] = useState<Record<string, BeliefRow>>({});
  const [enrichingKey, setEnrichingKey] = useState<string | null>(null);
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    if (!user) return;
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase
        .from("belief_sources")
        .select("id,belief_id,source_type,label,avatar_url,metadata")
        .eq("user_id", user.id),
      supabase.from("belief_nodes").select("id,topic,statement,layer,confidence").eq("user_id", user.id),
    ]);
    setSources((s as SourceRow[]) ?? []);
    const map: Record<string, BeliefRow> = {};
    for (const x of (b as BeliefRow[]) ?? []) map[x.id] = x;
    setBeliefs(map);
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const grouped = useMemo(() => {
    const m = new Map<string, InfluenceGroup>();
    for (const s of sources) {
      const key = `${s.source_type}::${s.label.toLowerCase()}`;
      const rowMeta = parseInfluenceMeta(s.metadata);
      if (!m.has(key)) {
        m.set(key, {
          key,
          type: s.source_type,
          label: s.label,
          beliefIds: [],
          sourceRowIds: [],
          avatar_url: s.avatar_url,
          meta: {},
        });
      }
      const g = m.get(key)!;
      g.sourceRowIds.push(s.id);
      if (!g.beliefIds.includes(s.belief_id)) g.beliefIds.push(s.belief_id);
      if (s.avatar_url && !g.avatar_url) g.avatar_url = s.avatar_url;
      const pickBio = (a: InfluenceMeta, b: InfluenceMeta) => {
        const la = a.bio?.length ?? 0;
        const lb = b.bio?.length ?? 0;
        if (lb > la) return b;
        return a;
      };
      g.meta = pickBio(g.meta, rowMeta);
      if (rowMeta.source_url && !g.meta.source_url) g.meta = { ...g.meta, source_url: rowMeta.source_url };
      if (rowMeta.enrichment_source && !g.meta.enrichment_source) {
        g.meta = { ...g.meta, enrichment_source: rowMeta.enrichment_source };
      }
    }
    return Array.from(m.values()).sort((a, b) => b.beliefIds.length - a.beliefIds.length);
  }, [sources]);

  const applyEnrichmentToRows = useCallback(
    async (group: InfluenceGroup, payload: EnrichResponse): Promise<boolean> => {
      if (!user) return false;
      const { data: rows, error: qErr } = await supabase
        .from("belief_sources")
        .select("metadata,avatar_url")
        .in("id", group.sourceRowIds)
        .eq("user_id", user.id)
        .limit(1);
      if (qErr || !rows?.length) {
        toast({
          title: "Could not load sources",
          description: qErr?.message ?? "No matching rows.",
          variant: "destructive",
        });
        return false;
      }
      const baseMeta = parseInfluenceMeta(rows[0].metadata);
      const newAvatar =
        (typeof payload.avatar_url === "string" && payload.avatar_url.trim()) ||
        (typeof rows[0].avatar_url === "string" && rows[0].avatar_url.trim()) ||
        group.avatar_url ||
        null;
      const newBio =
        (typeof payload.bio === "string" && payload.bio.trim()) || baseMeta.bio || "";
      const newSourceUrl =
        (typeof payload.source_url === "string" && payload.source_url.trim()) ||
        baseMeta.source_url ||
        "";
      const enrichment_source = payload.source ?? baseMeta.enrichment_source;
      const nextMeta: InfluenceMeta = {
        ...baseMeta,
        ...(newBio ? { bio: newBio } : {}),
        ...(newSourceUrl ? { source_url: newSourceUrl } : {}),
        ...(enrichment_source ? { enrichment_source } : {}),
        enriched_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("belief_sources")
        .update({
          avatar_url: newAvatar,
          metadata: metaToJson(nextMeta),
        })
        .in("id", group.sourceRowIds)
        .eq("user_id", user.id);

      if (error) {
        toast({ title: "Could not save profile", description: error.message, variant: "destructive" });
        return false;
      }
      await reload();
      return true;
    },
    [user, reload],
  );

  const invokeEnrich = useCallback(async (group: InfluenceGroup): Promise<EnrichResponse | null> => {
    const { data, error } = await supabase.functions.invoke("framework-enrich-influence", {
      body: { name: group.label, scope: group.type, hint: undefined },
    });
    if (error) {
      toast({ title: "Enrichment failed", description: error.message, variant: "destructive" });
      return null;
    }
    const payload = data as EnrichResponse;
    if (payload?.error) {
      toast({ title: "Enrichment failed", description: payload.error, variant: "destructive" });
      return null;
    }
    return payload ?? null;
  }, []);

  const enrichOne = useCallback(
    async (group: InfluenceGroup) => {
      setEnrichingKey(group.key);
      try {
        const payload = await invokeEnrich(group);
        if (!payload) return;
        if (!payload.bio && !payload.avatar_url) {
          toast({ title: "No public profile found", description: `Nothing turned up for “${group.label}”.` });
          return;
        }
        const ok = await applyEnrichmentToRows(group, payload);
        if (ok) toast({ title: "Profile updated", description: group.label });
      } finally {
        setEnrichingKey(null);
      }
    },
    [invokeEnrich, applyEnrichmentToRows],
  );

  const enrichMissingAvatars = useCallback(async () => {
    const targets = grouped.filter((g) => !g.avatar_url);
    if (targets.length === 0) {
      toast({ title: "Nothing to enrich", description: "Every influence already has an avatar image." });
      return;
    }
    setBulkEnriching(true);
    let ok = 0;
    let miss = 0;
    let fail = 0;
    try {
      for (const g of targets) {
        const payload = await invokeEnrich(g);
        if (!payload) {
          fail += 1;
        } else if (!payload.bio && !payload.avatar_url) {
          miss += 1;
        } else {
          const saved = await applyEnrichmentToRows(g, payload);
          if (saved) ok += 1;
          else fail += 1;
        }
        await sleep(ENRICH_GAP_MS);
      }
      toast({
        title: "Enrichment finished",
        description: `${ok} updated · ${miss} not found · ${fail} failed`,
      });
    } finally {
      setBulkEnriching(false);
    }
  }, [grouped, invokeEnrich, applyEnrichmentToRows]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <FrameworkLayout title="Influences" back="/framework">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
        <p className="text-sm text-muted-foreground max-w-prose">
          Who and what shaped your beliefs. Add sources from any belief&apos;s detail page — mentors,
          denominations, books, podcasts, scripture, lived experience.
        </p>
        {grouped.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={bulkEnriching || enrichingKey !== null}
            onClick={() => void enrichMissingAvatars()}
          >
            <Sparkles className="h-3.5 w-3.5 opacity-80" />
            {bulkEnriching ? "Enriching…" : "Enrich missing"}
          </Button>
        ) : null}
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="font-display text-lg text-foreground mb-1">No influences yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            When you note who or what shaped a belief, it appears here as a profile card you can enrich from
            public sources.
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link to="/framework/beliefs">Open beliefs</Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Add from any belief&apos;s detail page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {grouped.map((g) => {
            const sampleId = g.beliefIds[0];
            const sample = sampleId ? beliefs[sampleId] : undefined;
            const isOpen = openKeys[g.key] ?? false;
            const busy = enrichingKey === g.key;
            const displayUrl = g.meta.source_url;
            const bio = g.meta.bio?.trim();

            return (
              <Card
                key={g.key}
                className="overflow-hidden border-border/80 bg-card shadow-sm transition-colors hover:border-border"
              >
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Avatar className="h-[72px] w-[72px] shrink-0 rounded-full ring-1 ring-border/60">
                      {g.avatar_url ? (
                        <AvatarImage src={g.avatar_url} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback
                        className="text-lg font-medium text-white tracking-tight border-0"
                        style={{ background: monogramGradient(g.label) }}
                      >
                        {initialsFromName(g.label)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-display text-base leading-snug truncate">{g.label}</h3>
                          <Badge variant="secondary" className="mt-1 text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                            {scopeLabel(g.type)}
                          </Badge>
                        </div>
                        {displayUrl ? (
                          <a
                            href={displayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                            aria-label="Open source article"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm min-h-[3.75rem]">
                    {bio ? (
                      <p className="text-muted-foreground line-clamp-3 leading-relaxed">{bio}</p>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-muted-foreground/80 italic text-sm">No bio yet</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 text-xs -mr-2"
                          disabled={busy || bulkEnriching}
                          onClick={() => void enrichOne(g)}
                        >
                          {busy ? "…" : "Enrich"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
                      <span>
                        {g.beliefIds.length} {g.beliefIds.length === 1 ? "belief" : "beliefs"}
                      </span>
                      {bio ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs -mr-2"
                          disabled={busy || bulkEnriching}
                          onClick={() => void enrichOne(g)}
                        >
                          {busy ? "…" : "Refresh"}
                        </Button>
                      ) : null}
                    </div>
                    {sample ? (
                      <Link
                        to={`/framework/beliefs/${sample.id}`}
                        className="block rounded-md bg-muted/40 px-2.5 py-2 text-xs leading-snug hover:bg-muted/70 transition-colors"
                      >
                        <span className="font-medium text-foreground">{sample.topic}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {sample.statement.slice(0, 72)}
                          {sample.statement.length > 72 ? "…" : ""}
                        </span>
                      </Link>
                    ) : null}

                    {g.beliefIds.length > 1 ? (
                      <Collapsible
                        open={isOpen}
                        onOpenChange={(o) => setOpenKeys((prev) => ({ ...prev, [g.key]: o }))}
                      >
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            {isOpen ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Hide beliefs
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                View all beliefs
                              </>
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-0.5 pt-1">
                          {g.beliefIds.slice(1).map((bid) => {
                            const b = beliefs[bid];
                            if (!b) return null;
                            return (
                              <Link
                                key={bid}
                                to={`/framework/beliefs/${bid}`}
                                className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                              >
                                <span className="font-medium text-foreground">{b.topic}</span>
                                <span className="mx-1.5 opacity-40">·</span>
                                <span>{b.statement.slice(0, 64)}{b.statement.length > 64 ? "…" : ""}</span>
                              </Link>
                            );
                          })}
                        </CollapsibleContent>
                      </Collapsible>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/80 text-center mt-10 max-w-lg mx-auto leading-relaxed">
        Profile info is pulled from public sources and may not be perfectly accurate.
      </p>
    </FrameworkLayout>
  );
}
