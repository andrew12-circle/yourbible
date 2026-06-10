import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listBibles, type BibleEntry } from "@/lib/bible/api";
import { LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import { toast } from "@/hooks/use-toast";
import { HOME_PROFILE_PHOTO_STORAGE_KEY } from "@/lib/homeProfilePhoto";
import {
  parseHomeLayoutMedia,
  resolveHomeMediaUrl,
  uploadHomeProfilePhoto,
  uploadHomeWallpaper,
  type HomeMode,
} from "@/lib/profile/homeMedia";

const WALLPAPER_KEY = "yb_home_wallpaper";

export type HomeLayoutSettings = {
  homeWallpaper?: string;
  homeWallpaperTint?: number;
  homeWallpaperBlur?: number;
  homeProfilePhoto?: string;
  homeMode?: HomeMode;
};

export function useSettingsPage() {
  const { user, profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(profile?.display_name ?? "");
  const [dobDraft, setDobDraft] = useState(profile?.date_of_birth ?? "");
  const [wallpaper, setWallpaper] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(WALLPAPER_KEY) : null,
  );
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(HOME_PROFILE_PHOTO_STORAGE_KEY) : null,
  );
  const [wallpaperTint, setWallpaperTint] = useState(24);
  const [wallpaperBlur, setWallpaperBlur] = useState(0);
  const wallpaperFileRef = useRef<HTMLInputElement>(null);
  const profilePhotoFileRef = useRef<HTMLInputElement>(null);
  const [bibles, setBibles] = useState<BibleEntry[]>([]);
  const [bibleId, setBibleId] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_BIBLE_KEY) ?? "" : "",
  );

  useEffect(() => {
    listBibles()
      .then((list) => {
        setBibles(list);
        const stored = localStorage.getItem(LS_BIBLE_KEY);
        const found =
          list.find((b) => b.id === stored) ??
          list.find((b) => b.abbreviation === "CSB") ??
          list[0];
        if (found) {
          setBibleId(found.id);
          localStorage.setItem(LS_BIBLE_KEY, found.id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setDisplayNameDraft(profile?.display_name ?? "");
  }, [profile?.display_name]);

  useEffect(() => {
    setDobDraft(profile?.date_of_birth ?? "");
  }, [profile?.date_of_birth]);

  useEffect(() => {
    if (!profile?.layout) return;
    const parsed = parseHomeLayoutMedia(profile.layout);
    if (typeof parsed.homeWallpaperTint === "number") setWallpaperTint(parsed.homeWallpaperTint);
    if (typeof parsed.homeWallpaperBlur === "number") setWallpaperBlur(parsed.homeWallpaperBlur);

    let cancelled = false;
    (async () => {
      const [wp, photo] = await Promise.all([
        resolveHomeMediaUrl(parsed.homeWallpaper),
        resolveHomeMediaUrl(parsed.homeProfilePhoto),
      ]);
      if (cancelled) return;
      if (wp) {
        setWallpaper(wp);
        try {
          localStorage.setItem(WALLPAPER_KEY, wp);
        } catch {
          // Quota — signed URL still works for this session.
        }
      }
      if (photo) {
        setProfilePhoto(photo);
        try {
          localStorage.setItem(HOME_PROFILE_PHOTO_STORAGE_KEY, photo);
        } catch {
          // Quota — signed URL still works for this session.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.layout]);

  const currentLayout = (() => {
    if (!profile?.layout) return {} as HomeLayoutSettings;
    try {
      return JSON.parse(profile.layout) as HomeLayoutSettings;
    } catch {
      return {} as HomeLayoutSettings;
    }
  })();

  const save = async (patch: Parameters<typeof updateProfile>[0]) => {
    setSaving(true);
    const { error } = await updateProfile(patch);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Could not save", description: error.message });
      return;
    }
    toast({ title: "Saved" });
  };

  const saveHomeLayout = async (patch: HomeLayoutSettings) => {
    await save({
      layout: JSON.stringify({
        ...currentLayout,
        homeWallpaper: wallpaper ?? currentLayout.homeWallpaper,
        homeProfilePhoto: profilePhoto ?? currentLayout.homeProfilePhoto,
        homeWallpaperTint: wallpaperTint,
        homeWallpaperBlur: wallpaperBlur,
        ...patch,
      }),
    });
  };

  const onUploadWallpaper = async (file: File) => {
    if (!user) return;
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max size is 100 MB." });
      return;
    }
    setSaving(true);
    try {
      const path = await uploadHomeWallpaper(user.id, file);
      const url = await resolveHomeMediaUrl(path);
      if (!url) throw new Error("Could not load uploaded wallpaper.");
      setWallpaper(url);
      try {
        localStorage.setItem(WALLPAPER_KEY, url);
      } catch {
        // Signed URL still works for this session.
      }
      await saveHomeLayout({ homeWallpaper: path });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not save wallpaper",
        description: e instanceof Error ? e.message : "Upload failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onUploadProfilePhoto = async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max size is 20 MB." });
      return;
    }
    setSaving(true);
    try {
      const path = await uploadHomeProfilePhoto(user.id, file);
      const url = await resolveHomeMediaUrl(path);
      if (!url) throw new Error("Could not load uploaded profile photo.");
      setProfilePhoto(url);
      try {
        localStorage.setItem(HOME_PROFILE_PHOTO_STORAGE_KEY, url);
      } catch {
        // Signed URL still works for this session.
      }
      await saveHomeLayout({ homeProfilePhoto: path });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not save profile photo",
        description: e instanceof Error ? e.message : "Upload failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveWallpaperPresentation = (nextTint: number, nextBlur: number) => {
    void saveHomeLayout({ homeWallpaperTint: nextTint, homeWallpaperBlur: nextBlur });
  };

  const saveDisplayName = () => {
    if (!profile || (profile.display_name ?? "") === displayNameDraft) return;
    void save({ display_name: displayNameDraft });
  };

  const saveBirthDate = () => {
    if (!profile) return;
    const next = dobDraft.trim() ? dobDraft.trim() : null;
    const prevRaw = profile.date_of_birth ?? null;
    const prev = prevRaw != null && String(prevRaw).trim() !== "" ? String(prevRaw).trim() : null;
    if (next !== prev) void save({ date_of_birth: next });
  };

  const onBibleChange = (nextId: string) => {
    setBibleId(nextId);
    localStorage.setItem(LS_BIBLE_KEY, nextId);
    toast({ title: "Translation updated", description: "Applies when you open the reader." });
  };

  const initials = (profile?.display_name || user?.email || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return {
    user,
    profile,
    saving,
    displayNameDraft,
    setDisplayNameDraft,
    dobDraft,
    setDobDraft,
    wallpaper,
    profilePhoto,
    wallpaperTint,
    setWallpaperTint,
    wallpaperBlur,
    setWallpaperBlur,
    wallpaperFileRef,
    profilePhotoFileRef,
    bibles,
    bibleId,
    currentLayout,
    save,
    saveHomeLayout,
    onUploadWallpaper,
    onUploadProfilePhoto,
    saveWallpaperPresentation,
    saveDisplayName,
    saveBirthDate,
    onBibleChange,
    initials,
  };
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
