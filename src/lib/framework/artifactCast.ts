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

const CAST_KIND_ORDER: Record<CastMemberKind, number> = {
  host: 0,
  guest: 1,
  mention: 2,
};

const GUEST_ROLE_RE =
  /\b(guest|speaker|co-?host|panelist|interviewee|pastor|preacher|teacher|apologist|minister)\b/i;

function normalizeCastName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^st\.?\s+/i, "")
    .replace(/^saint\s+/i, "")
    .replace(/\s+/g, " ");
}

function looksLikePanelGuestName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 && parts.every((p) => p.length >= 2);
}

function roleSuggestsGuest(subtitle: string | null | undefined): boolean {
  const role = subtitle?.trim();
  if (!role) return false;
  return GUEST_ROLE_RE.test(role);
}

function shouldPromotePersonToGuest(
  title: string,
  subtitle: string | null | undefined,
  confidence: number | null,
  mentionCount: number,
): boolean {
  if (roleSuggestsGuest(subtitle)) return true;
  if (!looksLikePanelGuestName(title)) return false;
  if (mentionCount >= 2) return true;
  return (confidence ?? 0) >= 0.65;
}

type PersonEntityLike = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  avatar_url?: string | null;
};

type MentionLike = {
  confidence: number | null;
  knowledge_entities: PersonEntityLike | null;
};

function sortCastMembers(members: CastMember[]): CastMember[] {
  return [...members].sort((a, b) => {
    const byKind = CAST_KIND_ORDER[a.kind] - CAST_KIND_ORDER[b.kind];
    if (byKind !== 0) return byKind;
    return (b.mentionCount ?? 0) - (a.mentionCount ?? 0) || a.title.localeCompare(b.title);
  });
}

export function buildArtifactCastMembers(
  metadata: ArtifactMetadata | null | undefined,
  mentions: MentionLike[],
  artifactTitle?: string | null,
): CastMember[] {
  const out: CastMember[] = [];
  const seen = new Set<string>();

  const hostName = channelAndAuthorLine(metadata)?.trim();
  const hostKey = hostName ? normalizeCastName(hostName) : "";

  if (hostName) {
    seen.add(hostKey);
    out.push({
      key: `host:${hostKey}`,
      title: hostName,
      kind: "host",
      avatarUrl: metadata?.channel_thumbnail_url?.trim() || null,
    });
  }

  for (const guest of guestNamesForListRow(metadata, artifactTitle)) {
    const key = normalizeCastName(guest);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key: `guest:${key}`,
      title: guest,
      kind: "guest",
    });
  }

  const entityCounts = new Map<
    string,
    { entity: PersonEntityLike; count: number; confidence: number | null }
  >();
  for (const m of mentions) {
    const ent = m.knowledge_entities;
    if (!ent || ent.kind !== "person") continue;
    const existing = entityCounts.get(ent.id);
    if (existing) {
      existing.count += 1;
      if (m.confidence != null && (existing.confidence == null || m.confidence > existing.confidence)) {
        existing.confidence = m.confidence;
      }
    } else {
      entityCounts.set(ent.id, { entity: ent, count: 1, confidence: m.confidence });
    }
  }

  const pendingPersonMentions: Array<{
    entity: PersonEntityLike;
    count: number;
    confidence: number | null;
  }> = [];

  for (const row of entityCounts.values()) {
    const { entity, count, confidence } = row;
    const key = normalizeCastName(entity.title);
    if (hostKey && key === hostKey) continue;

    const existingIdx = out.findIndex((c) => normalizeCastName(c.title) === key);
    if (existingIdx >= 0) {
      const member = out[existingIdx];
      out[existingIdx] = {
        ...member,
        entityId: entity.id,
        avatarUrl: member.avatarUrl || entity.avatar_url || null,
        mentionCount: count,
        mentionConfidence: confidence,
      };
      continue;
    }

    if (seen.has(key)) continue;
    pendingPersonMentions.push({ entity, count, confidence });
  }

  for (const { entity, count, confidence } of pendingPersonMentions) {
    const key = normalizeCastName(entity.title);
    const kind: CastMemberKind = shouldPromotePersonToGuest(
      entity.title,
      entity.subtitle,
      confidence,
      count,
    )
      ? "guest"
      : "mention";
    seen.add(key);
    out.push({
      key: `${kind}:${entity.id}`,
      title: entity.title,
      kind,
      entityId: entity.id,
      avatarUrl: entity.avatar_url || null,
      mentionCount: count,
      mentionConfidence: confidence,
    });
  }

  return sortCastMembers(out);
}

export function castKindLabel(kind: CastMemberKind): string {
  if (kind === "host") return "Host";
  if (kind === "guest") return "Guest";
  return "Mentioned";
}
