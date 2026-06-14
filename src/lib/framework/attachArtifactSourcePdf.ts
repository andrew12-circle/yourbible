import { supabase } from "@/integrations/supabase/client";

/** Upload the original PDF for an existing artifact (keeps text + claims). */
export async function attachArtifactSourcePdf(
  userId: string,
  artifactId: string,
  file: File,
): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Choose a PDF file.");
  }

  const storagePath = `${userId}/artifacts/${artifactId}.pdf`;
  const { error: uploadErr } = await supabase.storage.from("artifact-uploads").upload(storagePath, file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadErr) throw new Error(uploadErr.message);

  const { data: row, error: readErr } = await supabase
    .from("artifacts")
    .select("metadata")
    .eq("id", artifactId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  const prev = (row?.metadata as Record<string, unknown> | null) ?? {};
  const { error: metaErr } = await supabase
    .from("artifacts")
    .update({ metadata: { ...prev, pdf_storage_path: storagePath } })
    .eq("id", artifactId);
  if (metaErr) throw new Error(metaErr.message);

  return storagePath;
}
