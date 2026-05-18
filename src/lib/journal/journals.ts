import { supabase } from "@/integrations/supabase/client";

export interface Journal {
  id: string;
  user_id: string;
  name: string;
  color: string; // HSL components, e.g. "211 100% 50%"
  icon: string;
  cover_kind: "color" | "photo";
  cover_value: string | null;
  cover_focal_x: number;
  cover_focal_y: number;
  sort_order: number;
  is_default: boolean;
  source_kind: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

/** Color palette used when creating new journals. HSL components only. */
export const JOURNAL_COLORS: { name: string; value: string }[] = [
  { name: "Blue",     value: "211 100% 50%" },
  { name: "Indigo",   value: "243 75% 59%" },
  { name: "Violet",   value: "265 83% 58%" },
  { name: "Pink",     value: "330 81% 60%" },
  { name: "Red",      value: "0 84% 60%" },
  { name: "Orange",   value: "25 95% 53%" },
  { name: "Amber",    value: "38 92% 50%" },
  { name: "Green",    value: "142 71% 45%" },
  { name: "Teal",     value: "172 66% 50%" },
  { name: "Slate",    value: "215 16% 47%" },
];

/**
 * Ensure the user has at least one default journal. Idempotent — safe to call
 * on every page load. Returns all journals.
 */
export async function ensureDefaultJournal(userId: string): Promise<Journal[]> {
  const { data: existing } = await supabase
    .from("journals")
    .select("*")
    .order("sort_order")
    .order("created_at");

  if (existing && existing.length > 0) return existing as Journal[];

  const { data: created } = await supabase
    .from("journals")
    .insert({
      user_id: userId,
      name: "Journal",
      color: "211 100% 50%",
      icon: "book",
      sort_order: 0,
      is_default: true,
      source_kind: "manual",
    })
    .select("*")
    .maybeSingle();

  return created ? [created as Journal] : [];
}

/** Fetch journals (no bootstrap). */
export async function listJournals(): Promise<Journal[]> {
  const { data } = await supabase
    .from("journals")
    .select("*")
    .order("sort_order")
    .order("created_at");
  return (data as Journal[]) ?? [];
}

export async function getDefaultJournalId(userId: string): Promise<string | null> {
  const list = await ensureDefaultJournal(userId);
  return list.find((j) => j.is_default)?.id ?? list[0]?.id ?? null;
}

export async function createJournal(
  userId: string,
  input: { name: string; color: string; icon?: string },
): Promise<Journal | null> {
  const { data } = await supabase
    .from("journals")
    .insert({
      user_id: userId,
      name: input.name,
      color: input.color,
      icon: input.icon ?? "book",
      sort_order: 9999,
      is_default: false,
      source_kind: "manual",
    })
    .select("*")
    .maybeSingle();
  return (data as Journal) ?? null;
}

function journalUpdateErrorMessage(message: string): string {
  if (/cover_focal_[xy]/i.test(message)) {
    return (
      "Cover position could not be saved. Apply the database migration " +
      "supabase/migrations/20260518040000_journal_cover_focal.sql " +
      "(e.g. run `supabase db push` against your project)."
    );
  }
  return message;
}

export async function updateJournal(
  id: string,
  patch: Partial<
    Pick<
      Journal,
      | "name"
      | "color"
      | "icon"
      | "sort_order"
      | "cover_kind"
      | "cover_value"
      | "cover_focal_x"
      | "cover_focal_y"
    >
  >,
) {
  const { data, error } = await supabase
    .from("journals")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(journalUpdateErrorMessage(error.message));
  }
  if (!data) {
    throw new Error("Journal not found or you don't have permission to update it.");
  }
}

export async function deleteJournal(id: string) {
  // Reassign entries to default first
  const { data: def } = await supabase
    .from("journals")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();
  if (def?.id) {
    await supabase.from("journal_entries").update({ journal_id: def.id }).eq("journal_id", id);
  }
  await supabase.from("journals").delete().eq("id", id);
}

/** CSS color string for use in `style={{ color/background: journalCss(j) }}`. */
export function journalCss(j: Pick<Journal, "color">) {
  return `hsl(${j.color})`;
}

/** Lighter tint for backgrounds. */
export function journalCssTint(j: Pick<Journal, "color">, alpha = 0.12) {
  return `hsl(${j.color} / ${alpha})`;
}