import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type KnowledgeEntityRow = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown> | null;
  confidence: number | null;
};

type MentionRow = {
  id: string;
  snippet: string | null;
  confidence: number | null;
  knowledge_entities: KnowledgeEntityRow | null;
};

const KIND_ORDER = [
  "book",
  "person",
  "scripture",
  "dream_vision",
  "fear",
  "question",
  "project",
  "business",
  "system",
  "technology",
] as const;

const KIND_LABEL: Record<string, string> = {
  book: "Books",
  person: "People",
  scripture: "Scriptures",
  dream_vision: "Dreams / visions",
  fear: "Fears",
  question: "Questions",
  project: "Projects",
  business: "Businesses",
  system: "Systems",
  technology: "Technologies",
};

function confidenceDotClass(c: number | null | undefined) {
  if (c == null || Number.isNaN(c)) return "bg-muted-foreground/40";
  if (c >= 0.8) return "bg-emerald-500/90";
  if (c >= 0.6) return "bg-amber-500/85";
  return "bg-orange-400/80";
}

type OtherMention = {
  id: string;
  snippet: string | null;
  created_at: string;
  artifact_id: string | null;
  artifacts: { title: string | null } | null;
};

function EntityChipPopover({
  entity,
  mentionConfidence,
  currentArtifactId,
}: {
  entity: KnowledgeEntityRow;
  mentionConfidence: number | null;
  currentArtifactId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [others, setOthers] = useState<OtherMention[]>([]);

  const loadOthers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("entity_mentions")
      .select("id, snippet, created_at, artifact_id, artifacts(title)")
      .eq("entity_id", entity.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setLoading(false);
    if (error) {
      setOthers([]);
      return;
    }
    setOthers((data as unknown as OtherMention[]) ?? []);
  }, [entity.id]);

  useEffect(() => {
    if (open) void loadOthers();
  }, [open, loadOthers]);

  const distinctArtifacts = useMemo(() => {
    const ids = new Set<string>();
    for (const row of others) {
      if (row.artifact_id) ids.add(row.artifact_id);
    }
    return ids.size;
  }, [others]);

  const subtitle = entity.subtitle?.trim();
  const metaSummary =
    typeof entity.metadata?.summary === "string" ? (entity.metadata.summary as string).trim() : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-left text-xs font-medium text-foreground shadow-sm transition",
            "hover:bg-muted/60 active:scale-[0.99]",
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", confidenceDotClass(mentionConfidence ?? entity.confidence))}
            title={mentionConfidence != null ? `Confidence ${Math.round(mentionConfidence * 100)}%` : undefined}
          />
          <span className="truncate">{entity.title}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{KIND_LABEL[entity.kind] ?? entity.kind}</div>
          <div className="text-sm font-semibold leading-snug">{entity.title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div> : null}
          {metaSummary ? <div className="mt-1 text-xs text-muted-foreground line-clamp-3">{metaSummary}</div> : null}
        </div>
        <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground">
          {loading ? (
            "Loading mentions…"
          ) : (
            <>
              Mentioned in <span className="font-medium text-foreground">{distinctArtifacts}</span> artifact
              {distinctArtifacts === 1 ? "" : "s"}
            </>
          )}
        </div>
        {!loading && others.length > 0 && (
          <ul className="max-h-44 space-y-2 overflow-y-auto pr-1 text-xs">
            {others.map((row) => {
              const isHere = row.artifact_id === currentArtifactId;
              const title = row.artifacts?.title?.trim() || "Untitled artifact";
              return (
                <li key={row.id} className="rounded-md border border-border/60 bg-card/60 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span className="truncate">{title}</span>
                    {isHere ? <span className="shrink-0 text-foreground/80">This page</span> : null}
                  </div>
                  {row.snippet ? (
                    <p className="mt-1 line-clamp-2 font-serif text-[11px] leading-relaxed text-foreground/90">{row.snippet}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function ArtifactEntitiesPanel({
  artifactId,
  artifactStatus,
}: {
  artifactId: string;
  artifactStatus: string;
}) {
  const { user } = useAuth();
  const [mentions, setMentions] = useState<MentionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("entity_mentions")
      .select("id, snippet, confidence, knowledge_entities(id, kind, title, subtitle, metadata, confidence)")
      .eq("artifact_id", artifactId)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      setMentions([]);
      return;
    }
    setMentions((data as unknown as MentionRow[]) ?? []);
  }, [artifactId, user]);

  useEffect(() => {
    void load();
  }, [load, artifactStatus]);

  const grouped = useMemo(() => {
    const map = new Map<string, MentionRow[]>();
    for (const m of mentions) {
      const ent = m.knowledge_entities;
      if (!ent) continue;
      const list = map.get(ent.kind) ?? [];
      list.push(m);
      map.set(ent.kind, list);
    }
    const kindRank = (k: string) => {
      const i = KIND_ORDER.indexOf(k as (typeof KIND_ORDER)[number]);
      return i === -1 ? 999 : i;
    };
    const kinds = [...map.keys()].sort((a, b) => kindRank(a) - kindRank(b));
    return { map, kinds };
  }, [mentions]);

  if (loading) {
    return (
      <div className="mb-4 rounded-lg border border-border bg-muted/15 px-3 py-2.5 text-xs text-muted-foreground">
        Loading knowledge entities…
      </div>
    );
  }

  if (mentions.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 rounded-lg border border-border bg-card/40 px-3 py-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Knowledge entities</div>
      <div className="space-y-3">
        {grouped.kinds.map((kind) => {
          const rows = grouped.map.get(kind) ?? [];
          if (!rows.length) return null;
          const label = KIND_LABEL[kind] ?? kind;
          return (
            <div key={kind}>
              <div className="mb-1.5 text-[11px] font-medium text-foreground/90">
                {label}{" "}
                <span className="font-normal text-muted-foreground">({rows.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rows.map((row) => {
                  const ent = row.knowledge_entities;
                  if (!ent) return null;
                  return (
                    <EntityChipPopover
                      key={row.id}
                      entity={ent}
                      mentionConfidence={row.confidence}
                      currentArtifactId={artifactId}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
