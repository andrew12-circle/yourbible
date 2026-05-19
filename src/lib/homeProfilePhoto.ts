import { isInlineOrRemoteMediaRef, parseHomeLayoutMedia } from "@/lib/profile/homeMedia";

/** Same key as Settings + Home — resolved display URL (signed, data, or remote). */
export const HOME_PROFILE_PHOTO_STORAGE_KEY = "yb_profile_photo";

/** Raw ref from profile.layout (storage path, data URL, or remote URL). */
export function homeProfilePhotoRefFromLayout(layout: string | null | undefined): string | null {
  const u = parseHomeLayoutMedia(layout).homeProfilePhoto?.trim();
  return u || null;
}

/** Inline/remote URL only — safe for synchronous Avatar src without signing. */
export function homeProfilePhotoFromLayout(layout: string | null | undefined): string | null {
  const ref = homeProfilePhotoRefFromLayout(layout);
  if (!ref || !isInlineOrRemoteMediaRef(ref)) return null;
  return ref;
}

export function readHomeProfilePhotoFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(HOME_PROFILE_PHOTO_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}
