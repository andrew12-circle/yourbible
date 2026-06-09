import { supabase } from "@/integrations/supabase/client";

export async function fetchSeenArtifactIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("artifact_library_seen")
    .select("artifact_id")
    .eq("user_id", userId);
  if (error) {
    console.warn("[artifactLibrarySeen] fetch failed", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.artifact_id as string));
}

export async function markArtifactLibrarySeen(userId: string, artifactId: string): Promise<void> {
  const { error } = await supabase.from("artifact_library_seen").upsert(
    {
      user_id: userId,
      artifact_id: artifactId,
      first_opened_at: new Date().toISOString(),
    },
    { onConflict: "user_id,artifact_id", ignoreDuplicates: true },
  );
  if (error) {
    console.warn("[artifactLibrarySeen] mark failed", error.message);
  }
}
