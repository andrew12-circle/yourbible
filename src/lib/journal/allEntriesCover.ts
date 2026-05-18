import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_COVER_FOCAL, journalCoverFocal } from "@/lib/journal/covers";

export type AllEntriesCoverKind = "none" | "photo";

export interface AllEntriesCoverSettings {
  all_entries_cover_kind: AllEntriesCoverKind;
  all_entries_cover_value: string | null;
  all_entries_cover_focal_x: number;
  all_entries_cover_focal_y: number;
}

export const EMPTY_ALL_ENTRIES_COVER: AllEntriesCoverSettings = {
  all_entries_cover_kind: "none",
  all_entries_cover_value: null,
  all_entries_cover_focal_x: DEFAULT_COVER_FOCAL.x,
  all_entries_cover_focal_y: DEFAULT_COVER_FOCAL.y,
};

export function allEntriesCoverFromProfile(
  profile: Partial<AllEntriesCoverSettings> | null | undefined,
): AllEntriesCoverSettings {
  if (!profile) return { ...EMPTY_ALL_ENTRIES_COVER };
  const kind = profile.all_entries_cover_kind === "photo" ? "photo" : "none";
  return {
    all_entries_cover_kind: kind,
    all_entries_cover_value: profile.all_entries_cover_value ?? null,
    all_entries_cover_focal_x: profile.all_entries_cover_focal_x ?? DEFAULT_COVER_FOCAL.x,
    all_entries_cover_focal_y: profile.all_entries_cover_focal_y ?? DEFAULT_COVER_FOCAL.y,
  };
}

export function allEntriesCoverFocal(settings: AllEntriesCoverSettings) {
  return journalCoverFocal({
    cover_focal_x: settings.all_entries_cover_focal_x,
    cover_focal_y: settings.all_entries_cover_focal_y,
  });
}

export function hasAllEntriesCoverPhoto(settings: AllEntriesCoverSettings): boolean {
  return settings.all_entries_cover_kind === "photo" && !!settings.all_entries_cover_value;
}

function allEntriesCoverUpdateErrorMessage(message: string): string {
  if (/all_entries_cover/i.test(message)) {
    return (
      "All Entries cover could not be saved. Apply the database migration " +
      "supabase/migrations/20260518120000_profiles_all_entries_cover.sql " +
      "(e.g. run `supabase db push` against your project)."
    );
  }
  return message;
}

export async function updateAllEntriesCover(
  userId: string,
  patch: Partial<AllEntriesCoverSettings>,
) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    throw new Error(allEntriesCoverUpdateErrorMessage(error.message));
  }
  if (!data) {
    throw new Error("Profile not found or you don't have permission to update it.");
  }
}
