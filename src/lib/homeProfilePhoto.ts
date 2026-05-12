/** Same key as Settings + Home — data URL or remote URL string. */
export const HOME_PROFILE_PHOTO_STORAGE_KEY = "yb_profile_photo";

export function homeProfilePhotoFromLayout(layout: string | null | undefined): string | null {
  if (!layout?.trim()) return null;
  try {
    const o = JSON.parse(layout) as { homeProfilePhoto?: string };
    const u = o.homeProfilePhoto?.trim();
    return u || null;
  } catch {
    return null;
  }
}

export function readHomeProfilePhotoFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(HOME_PROFILE_PHOTO_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}
