import { parseUtcDateOnly } from "@/lib/lifeWeeks";

export type FamilyMemberId = "lilly" | "caroline";

export type FamilyMember = {
  id: FamilyMemberId;
  name: string;
  birthDate: string | null;
};

export const FAMILY_MEMBER_IDS: FamilyMemberId[] = ["lilly", "caroline"];

export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  { id: "lilly", name: "Lilly", birthDate: null },
  { id: "caroline", name: "Caroline", birthDate: null },
];

function parseLayoutRoot(layoutJson: string | null | undefined): Record<string, unknown> {
  if (!layoutJson?.trim()) return {};
  try {
    const parsed = JSON.parse(layoutJson) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function normalizeBirthDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const iso = raw.trim().slice(0, 10);
  return parseUtcDateOnly(iso) !== null ? iso : null;
}

export function parseFamilyFromLayout(layoutJson: string | null | undefined): FamilyMember[] {
  const root = parseLayoutRoot(layoutJson);
  const lifeWeeks = root.lifeWeeks;
  if (!lifeWeeks || typeof lifeWeeks !== "object" || Array.isArray(lifeWeeks)) {
    return DEFAULT_FAMILY_MEMBERS.map((m) => ({ ...m }));
  }
  const family = (lifeWeeks as Record<string, unknown>).family;
  if (!Array.isArray(family)) return DEFAULT_FAMILY_MEMBERS.map((m) => ({ ...m }));

  const byId = new Map<FamilyMemberId, FamilyMember>();
  for (const item of family) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = rec.id;
    if (id !== "lilly" && id !== "caroline") continue;
    byId.set(id, {
      id,
      name: typeof rec.name === "string" && rec.name.trim() ? rec.name.trim() : id === "lilly" ? "Lilly" : "Caroline",
      birthDate: normalizeBirthDate(rec.birthDate),
    });
  }

  return DEFAULT_FAMILY_MEMBERS.map((def) => byId.get(def.id) ?? { ...def });
}

export function patchLayoutWithFamily(
  layoutJson: string,
  members: FamilyMember[],
): string {
  const root = parseLayoutRoot(layoutJson);
  const prevLifeWeeks =
    root.lifeWeeks && typeof root.lifeWeeks === "object" && !Array.isArray(root.lifeWeeks)
      ? (root.lifeWeeks as Record<string, unknown>)
      : {};
  root.lifeWeeks = {
    ...prevLifeWeeks,
    family: members.map((m) => ({
      id: m.id,
      name: m.name,
      birthDate: m.birthDate,
    })),
  };
  return JSON.stringify(root);
}

export function familyMemberById(members: FamilyMember[], id: FamilyMemberId): FamilyMember {
  return members.find((m) => m.id === id) ?? DEFAULT_FAMILY_MEMBERS.find((m) => m.id === id)!;
}
