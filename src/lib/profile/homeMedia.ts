import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrl } from "@/lib/journal/photos";

const BUCKET = "journal-photos";

/** Values stored in profile.layout — storage path, legacy data URL, or remote URL. */
export type HomeMediaRef = string;

export type HomeMode = "ios" | "hub";

export type HomeLayoutMedia = {
  homeWallpaper?: HomeMediaRef;
  homeWallpaperTint?: number;
  homeWallpaperBlur?: number;
  homeProfilePhoto?: HomeMediaRef;
  /** Desktop home experience: iOS launcher vs command-center hub shell. */
  homeMode?: HomeMode;
};

export function parseHomeMode(layout: string | null | undefined): HomeMode {
  const mode = parseHomeLayoutMedia(layout).homeMode;
  return mode === "hub" ? "hub" : "ios";
}

export function isInlineOrRemoteMediaRef(ref: string): boolean {
  const t = ref.trim();
  return t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://");
}

export function isHomeMediaStoragePath(ref: string): boolean {
  const t = ref.trim();
  return t.length > 0 && !isInlineOrRemoteMediaRef(t);
}

export function parseHomeLayoutMedia(layout: string | null | undefined): HomeLayoutMedia {
  if (!layout?.trim()) return {};
  try {
    const parsed = JSON.parse(layout) as HomeLayoutMedia;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function resolveHomeMediaUrl(ref: string | null | undefined): Promise<string | null> {
  const t = ref?.trim();
  if (!t) return null;
  if (isInlineOrRemoteMediaRef(t)) return t;
  return getSignedPhotoUrl(t);
}

export async function uploadHomeWallpaper(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp|heic|gif)$/i.test(ext) ? ext : "jpg";
  const path = `${userId}/home/wallpaper.${safeExt}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || `image/${safeExt}` });
  if (error) throw error;
  return path;
}

export async function uploadHomeProfilePhoto(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = /^(jpg|jpeg|png|webp|heic|gif)$/i.test(ext) ? ext : "jpg";
  const path = `${userId}/home/profile.${safeExt}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || `image/${safeExt}` });
  if (error) throw error;
  return path;
}
