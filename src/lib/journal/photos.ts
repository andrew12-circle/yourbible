import { supabase } from "@/integrations/supabase/client";

export async function uploadEntryPhotos(
  userId: string,
  entryId: string,
  files: File[],
): Promise<{ storage_path: string; width?: number; height?: number }[]> {
  const out: { storage_path: string; width?: number; height?: number }[] = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = /^(jpg|jpeg|png|webp|heic|gif)$/i.test(ext) ? ext : "jpg";
    const path = `${userId}/${entryId}/${crypto.randomUUID()}.${safeExt}`;
    const dims = await imageDims(file).catch(() => undefined);
    const { error } = await supabase.storage
      .from("journal-photos")
      .upload(path, file, { upsert: false, contentType: file.type || `image/${safeExt}` });
    if (error) throw error;
    out.push({ storage_path: path, width: dims?.w, height: dims?.h });
  }
  return out;
}

export async function getSignedPhotoUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("journal-photos")
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function getSignedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage
    .from("journal-photos")
    .createSignedUrls(paths, 3600);
  const map: Record<string, string> = {};
  data?.forEach((row) => {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  });
  return map;
}

function imageDims(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = { w: img.naturalWidth, h: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(r);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}