import type { ArtifactMetadata } from "@/pages/framework/artifacts/artifactLibraryModel";
import { channelAndAuthorLine, guestNamesForListRow } from "@/pages/framework/artifacts/artifactLibraryModel";

export type CastMemberKind = "host" | "guest" | "mention";

export type CastMember = {
  key: string;
  title: string;
  kind: CastMemberKind;
  avatarUrl?: string | null;
  entityId?: string;
  mentionCount?: number;
  mentionConfidence?: number | null;
};

function normalizeCastName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^st\.?\s+/i, "")
    .replace(/^saint\s+/i, "")
    .replace(/\s+/g, " ");
}

type PersonEntityLike = {
  id: string;
  title: string;
  avatar_url?: string | null;
};

type MentionLike = {
  confidence: number | null;
  knowledge_entities: PersonEntityLike | null;
};

export function buildArtifactCastMembers(
  metadata: ArtifactMetadata | null | undefined,
  mentions: MentionLike[],
): CastMember[] {
  const out: CastMember[] = [];
  const seen = new Set<string>();

  const hostName = channelAndAuthorLine(metadata)?.trim();
  if (hostName) {
    const key = normalizeCastName(hostName);
    seen.add(key);
    out.push({
      key: `host:${key}`,
      title: hostName,
      kind: "host",
      avatarUrl: metadata?.channel_thumbnail_url?.trim() || null,
    });
  }

  for (const guest of guestNamesForListRow(metadata)) {
    const key = normalizeCastName(guest);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key: `guest:${key}`,
      title: guest,
      kind: "guest",
    });
  }

  const entityCounts = new Map<string, { entity: PersonEntityLike; count: number; confidence: number | null }>();
  for (const m of mentions) {
    const ent = m.knowledge_entities;
    if (!ent) continue;
    const existing = entityCounts.get(ent.id);
    if (existing) {
      existing.count += 1;
    } else {
      entityCounts.set(ent.id, { entity: ent, count: 1, confidence: m.confidence });
    }
  }

  for (const { entity, count, confidence } of entityCounts.values()) {
    const key = normalizeCastName(entity.title);
    const existingIdx = out.findIndex((c) => normalizeCastName(c.title) === key);
    if (existingIdx >= 0) {
      const row = out[existingIdx];
      out[existingIdx] = {
        ...row,
        entityId: entity.id,
        avatarUrl: row.avatarUrl || entity.avatar_url || null,
        mentionCount: count,
        mentionConfidence: confidence,
      };
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key: `mention:${entity.id}`,
      title: entity.title,
      kind: "mention",
      entityId: entity.id,
      avatarUrl: entity.avatar_url || null,
      mentionCount: count,
      mentionConfidence: confidence,
    });
  }

  return out;
}

export function castKindLabel(kind: CastMemberKind): string {
  if (kind === "host") return "Host";
  if (kind === "guest") return "Guest";
  return "Mentioned";
}
