import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useKnowledgeEntityAvatarEnrichment } from "@/hooks/useKnowledgeEntityAvatarEnrichment";
import {
  artifactHorizontalRail,
  artifactHorizontalRailBase,
  artifactMobileStudyContentInset,
  artifactMobileStudyRailLeadingPad,
} from "@/lib/framework/artifactSurfaces";
import {
  buildArtifactCastMembers,
  castKindLabel,
  type CastMember,
} from "@/lib/framework/artifactCast";
import { initialsFromName, isPersonEntityKind, monogramGradient } from "@/lib/framework/entityMonogram";
import type { ArtifactMetadata } from "@/pages/framework/artifacts/artifactLibraryModel";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type KnowledgeEntityRow = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  avatar_url: string | null;
  metadata: Record<string, unknown> | null;
  confidence: number | null;
};

type MentionRow = {
  id: string;
  snippet: string | null;
  confidence: number | null;
  knowledge_entities: KnowledgeEntityRow | null;
};

type RailEntry = {
  entity: KnowledgeEntityRow;
  count: number;
  confidence: number | null;
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

function CastMemberChip({
  member,
  entity,
  mentionConfidence,
  mentionCountInArtifact,
  currentArtifactId,
  variant = "personRail",
}: {
  member: CastMember;
  entity?: KnowledgeEntityRow;
  mentionConfidence?: number | null;
  mentionCountInArtifact?: number;
  currentArtifactId: string;
  variant?: "personRail";
}) {
  if (entity) {
    return (
      <EntityChipPopover
        entity={entity}
        mentionConfidence={mentionConfidence ?? null}
        currentArtifactId={currentArtifactId}
        mentionCountInArtifact={mentionCountInArtifact}
        variant={variant}
        roleLabel={castKindLabel(member.kind)}
      />
    );
  }

  const avatarUrl = member.avatarUrl?.trim() || null;
  return (
    <div
      className="inline-flex shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card px-3 py-3 min-w-[108px] max-w-[132px] text-left font-medium text-foreground shadow-sm"
      title={member.title}
    >
      <Avatar className="h-14 w-14 shrink-0 rounded-full ring-1 ring-border/60">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="object-cover" /> : null}
        <AvatarFallback
          className="text-sm font-medium text-white tracking-tight border-0"
          style={{ background: monogramGradient(member.title) }}
        >
          {initialsFromName(member.title)}
        </AvatarFallback>
      </Avatar>
      <span className="w-full truncate text-center text-sm font-display font-semibold leading-snug">
        {member.title}
      </span>
      <span className="text-[10px] text-muted-foreground">{castKindLabel(member.kind)}</span>
    </div>
  );
}

function EntityChipPopover({
  entity,
  mentionConfidence,
  currentArtifactId,
  mentionCountInArtifact,
  variant = "default",
  roleLabel,
}: {
  entity: KnowledgeEntityRow;
  mentionConfidence: number | null;
  currentArtifactId: string;
  mentionCountInArtifact?: number;
  variant?: "default" | "rail" | "personRail";
  roleLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [others, setOthers] = useState<OtherMention[]>([]);
  const isPerson = isPersonEntityKind(entity.kind);

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
  const metaBio = typeof entity.metadata?.bio === "string" ? (entity.metadata.bio as string).trim() : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-left font-medium text-foreground shadow-sm transition hover:bg-muted/60 active:scale-[0.99]",
            variant === "personRail"
              ? "inline-flex shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card px-3 py-3 min-w-[108px] max-w-[132px]"
              : variant === "rail"
                ? "inline-flex shrink-0 snap-start flex-col gap-1 rounded-2xl border border-border/50 bg-card px-4 py-3 min-w-[140px] max-w-[200px]"
                : "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-xs",
          )}
        >
          {variant === "personRail" ? (
            <>
              <Avatar className="h-14 w-14 shrink-0 rounded-full ring-1 ring-border/60">
                {entity.avatar_url ? (
                  <AvatarImage src={entity.avatar_url} alt="" className="object-cover" />
                ) : null}
                <AvatarFallback
                  className="text-sm font-medium text-white tracking-tight border-0"
                  style={{ background: monogramGradient(entity.title) }}
                >
                  {initialsFromName(entity.title)}
                </AvatarFallback>
              </Avatar>
              <span className="w-full truncate text-center text-sm font-display font-semibold leading-snug">
                {entity.title}
              </span>
              {roleLabel ? (
                <span className="text-[10px] text-muted-foreground">{roleLabel}</span>
              ) : mentionCountInArtifact != null ? (
                <span className="text-[10px] text-muted-foreground">
                  {mentionCountInArtifact} mention{mentionCountInArtifact === 1 ? "" : "s"}
                </span>
              ) : null}
            </>
          ) : variant === "rail" ? (
            <>
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className={cn("h-2 w-2 shrink-0 rounded-full", confidenceDotClass(mentionConfidence ?? entity.confidence))}
                  title={
                    mentionConfidence != null ? `Confidence ${Math.round(mentionConfidence * 100)}%` : undefined
                  }
                />
                <span className="truncate text-sm font-display font-semibold">{entity.title}</span>
              </span>
              {mentionCountInArtifact != null ? (
                <span className="text-[10px] text-muted-foreground">
                  {mentionCountInArtifact} mention{mentionCountInArtifact === 1 ? "" : "s"}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span
                className={cn("h-1.5 w-1.5 shrink-0 rounded-full", confidenceDotClass(mentionConfidence ?? entity.confidence))}
                title={
                  mentionConfidence != null ? `Confidence ${Math.round(mentionConfidence * 100)}%` : undefined
                }
              />
              <span className="truncate">{entity.title}</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="flex gap-3">
          {isPerson ? (
            <Avatar className="h-12 w-12 shrink-0 rounded-full ring-1 ring-border/60">
              {entity.avatar_url ? (
                <AvatarImage src={entity.avatar_url} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback
                className="text-sm font-medium text-white tracking-tight border-0"
                style={{ background: monogramGradient(entity.title) }}
              >
                {initialsFromName(entity.title)}
              </AvatarFallback>
            </Avatar>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {KIND_LABEL[entity.kind] ?? entity.kind}
            </div>
            <div className="text-sm font-semibold leading-snug">{entity.title}</div>
            {subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
        </div>
        {metaBio ? <div className="text-xs text-muted-foreground line-clamp-4">{metaBio}</div> : null}
        {metaSummary ? <div className="text-xs text-muted-foreground line-clamp-3">{metaSummary}</div> : null}
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
                    <p className="mt-1 line-clamp-2 font-serif text-[11px] leading-relaxed text-foreground/90">
                      {row.snippet}
                    </p>
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

function CastRail({
  members,
  entityById,
  variant,
  artifactId,
}: {
  members: CastMember[];
  entityById: Map<string, KnowledgeEntityRow>;
  variant: "mobileRail" | "desktopRail";
  artifactId: string;
}) {
  return (
    <div
      className={cn(
        variant === "mobileRail"
          ? cn(
              artifactHorizontalRailBase,
              "snap-x snap-mandatory w-full max-w-none",
              artifactMobileStudyRailLeadingPad,
            )
          : artifactHorizontalRail,
        variant === "desktopRail" && "gap-4 pb-2 -mx-0.5 px-0.5",
      )}
    >
      {members.map((member) => {
        const entity = member.entityId ? entityById.get(member.entityId) : undefined;
        return (
          <CastMemberChip
            key={member.key}
            member={member}
            entity={entity}
            mentionConfidence={member.mentionConfidence ?? null}
            mentionCountInArtifact={member.mentionCount}
            currentArtifactId={artifactId}
            variant="personRail"
          />
        );
      })}
    </div>
  );
}

function EntityRail({
  entries,
  variant,
  artifactId,
  personLayout,
}: {
  entries: RailEntry[];
  variant: "mobileRail" | "desktopRail";
  artifactId: string;
  personLayout?: boolean;
}) {
  return (
    <div
      className={cn(
        variant === "mobileRail"
          ? cn(
              artifactHorizontalRailBase,
              "snap-x snap-mandatory w-full max-w-none",
              artifactMobileStudyRailLeadingPad,
            )
          : artifactHorizontalRail,
        variant === "desktopRail" && "gap-4 pb-2 -mx-0.5 px-0.5",
      )}
    >
      {entries.map(({ entity, count, confidence }) => (
        <EntityChipPopover
          key={entity.id}
          entity={entity}
          mentionConfidence={confidence}
          currentArtifactId={artifactId}
          mentionCountInArtifact={count}
          variant={personLayout ? "personRail" : "rail"}
        />
      ))}
    </div>
  );
}

function EntitySectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>
  );
}

export default function ArtifactEntitiesPanel({
  artifactId,
  artifactStatus,
  artifactMetadata,
  variant = "default",
}: {
  artifactId: string;
  artifactStatus: string;
  artifactMetadata?: ArtifactMetadata | null;
  variant?: "default" | "mobileRail" | "desktopRail";
}) {
  const { user } = useAuth();
  const [mentions, setMentions] = useState<MentionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("entity_mentions")
      .select(
        "id, snippet, confidence, knowledge_entities(id, kind, title, subtitle, avatar_url, metadata, confidence)",
      )
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

  const useRailLayout = variant === "mobileRail" || variant === "desktopRail";

  const railEntries = useMemo(() => {
    if (!useRailLayout) return [];
    const byEntity = new Map<string, RailEntry>();
    for (const m of mentions) {
      const ent = m.knowledge_entities;
      if (!ent) continue;
      const existing = byEntity.get(ent.id);
      if (existing) {
        existing.count += 1;
      } else {
        byEntity.set(ent.id, { entity: ent, count: 1, confidence: m.confidence });
      }
    }
    const kindRank = (k: string) => {
      const i = KIND_ORDER.indexOf(k as (typeof KIND_ORDER)[number]);
      return i === -1 ? 999 : i;
    };
    return [...byEntity.values()].sort(
      (a, b) =>
        kindRank(a.entity.kind) - kindRank(b.entity.kind) ||
        a.entity.title.localeCompare(b.entity.title),
    );
  }, [mentions, useRailLayout]);

  const peopleRailEntries = useMemo(
    () => railEntries.filter((e) => isPersonEntityKind(e.entity.kind)),
    [railEntries],
  );
  const themeRailEntries = useMemo(
    () => railEntries.filter((e) => !isPersonEntityKind(e.entity.kind)),
    [railEntries],
  );

  const entityById = useMemo(() => {
    const map = new Map<string, KnowledgeEntityRow>();
    for (const m of mentions) {
      const ent = m.knowledge_entities;
      if (ent) map.set(ent.id, ent);
    }
    return map;
  }, [mentions]);

  const castMembers = useMemo(
    () => buildArtifactCastMembers(artifactMetadata, mentions),
    [artifactMetadata, mentions],
  );

  const castPeopleMembers = useMemo(
    () => castMembers.filter((m) => m.kind !== "mention" || m.entityId),
    [castMembers],
  );

  const personIdsNeedingAvatar = useMemo(() => {
    const byEntity = new Map<string, KnowledgeEntityRow>();
    for (const m of mentions) {
      const ent = m.knowledge_entities;
      if (!ent || !isPersonEntityKind(ent.kind)) continue;
      byEntity.set(ent.id, ent);
    }
    return [...byEntity.values()]
      .filter((e) => !e.avatar_url?.trim())
      .map((e) => e.id);
  }, [mentions]);

  useKnowledgeEntityAvatarEnrichment(personIdsNeedingAvatar, {
    enabled: !loading && personIdsNeedingAvatar.length > 0,
    onEnriched: load,
  });

  if (loading) {
    return (
      <div className="mb-4 rounded-lg border border-border bg-muted/15 px-3 py-2.5 text-xs text-muted-foreground">
        Loading knowledge entities…
      </div>
    );
  }

  const hasCastFromMeta = castPeopleMembers.length > 0;
  if (mentions.length === 0 && !hasCastFromMeta) {
    return null;
  }

  if (useRailLayout) {
    const labelInset = variant === "mobileRail" ? artifactMobileStudyContentInset : undefined;
    const showCast = castPeopleMembers.length > 0;
    return (
      <div className="space-y-5">
        {showCast ? (
          <div className={cn("space-y-3", labelInset)}>
            <EntitySectionLabel>Cast &amp; mentions</EntitySectionLabel>
            <CastRail
              members={castPeopleMembers}
              entityById={entityById}
              variant={variant === "mobileRail" ? "mobileRail" : "desktopRail"}
              artifactId={artifactId}
            />
          </div>
        ) : peopleRailEntries.length > 0 ? (
          <div className={cn("space-y-3", labelInset)}>
            <EntitySectionLabel>Cast &amp; mentions</EntitySectionLabel>
            <EntityRail
              entries={peopleRailEntries}
              variant={variant === "mobileRail" ? "mobileRail" : "desktopRail"}
              artifactId={artifactId}
              personLayout
            />
          </div>
        ) : null}
        {themeRailEntries.length > 0 ? (
          <div className={cn("space-y-3", labelInset)}>
            <EntitySectionLabel>Themes</EntitySectionLabel>
            <EntityRail
              entries={themeRailEntries}
              variant={variant === "mobileRail" ? "mobileRail" : "desktopRail"}
              artifactId={artifactId}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const peopleKinds = grouped.kinds.filter((k) => isPersonEntityKind(k));
  const themeKinds = grouped.kinds.filter((k) => !isPersonEntityKind(k));

  const renderKindGroup = (kind: string) => {
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
  };

  return (
    <section className="mb-4 rounded-lg border border-border bg-card/40 px-3 py-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Knowledge entities
      </div>
      <div className="space-y-4">
        {peopleKinds.length > 0 ? (
          <div className="space-y-3">
            <EntitySectionLabel>Cast &amp; mentions</EntitySectionLabel>
            {peopleKinds.map(renderKindGroup)}
          </div>
        ) : null}
        {themeKinds.length > 0 ? (
          <div className="space-y-3">
            <EntitySectionLabel>Themes</EntitySectionLabel>
            {themeKinds.map(renderKindGroup)}
          </div>
        ) : null}
      </div>
    </section>
  );
}
