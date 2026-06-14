import { supabase } from "@/integrations/supabase/client";

/** Download a file from artifact-uploads (uses session + RLS, not signed URLs). */
export async function downloadArtifactUploadBytes(storagePath: string): Promise<Uint8Array | null> {
  const path = storagePath.trim();
  if (!path) return null;

  const { data, error } = await supabase.storage.from("artifact-uploads").download(path);
  if (error || !data) return null;

  return new Uint8Array(await data.arrayBuffer());
}

/** Try storage paths in order; returns the first file that exists. */
export async function downloadFirstArtifactUpload(
  storagePaths: string[],
): Promise<{ bytes: Uint8Array; path: string } | null> {
  for (const path of storagePaths) {
    const bytes = await downloadArtifactUploadBytes(path);
    if (bytes) return { bytes, path };
  }
  return null;
}
