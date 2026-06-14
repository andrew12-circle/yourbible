import { supabase } from "@/integrations/supabase/client";
import { renderPdfBytesPageToBlob } from "@/lib/framework/renderPdfPageThumbnail";

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

  const pdfBytes = new Uint8Array(await file.arrayBuffer());
  const coverPath = `${userId}/artifacts/${artifactId}-cover.jpg`;
  try {
    const coverBlob = await renderPdfBytesPageToBlob(pdfBytes, 1);
    await supabase.storage.from("artifact-uploads").upload(coverPath, coverBlob, {
      contentType: "image/jpeg",
      upsert: true,
    });
  } catch {
    // Cover is optional — reading still works without it.
  }

  const { data: row, error: readErr } = await supabase
    .from("artifacts")
    .select("metadata")
    .eq("id", artifactId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  const prev = (row?.metadata as Record<string, unknown> | null) ?? {};
  const metadata: Record<string, unknown> = { ...prev, pdf_storage_path: storagePath };
  const { data: coverExists } = await supabase.storage.from("artifact-uploads").list(`${userId}/artifacts`, {
    search: `${artifactId}-cover.jpg`,
  });
  if (coverExists?.some((f) => f.name === `${artifactId}-cover.jpg`)) {
    metadata.cover_storage_path = coverPath;
  }

  const { error: metaErr } = await supabase
    .from("artifacts")
    .update({ metadata })
    .eq("id", artifactId);
  if (metaErr) throw new Error(metaErr.message);

  return storagePath;
}
