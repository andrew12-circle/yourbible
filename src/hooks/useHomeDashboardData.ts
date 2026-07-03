import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { HOME_PROFILE_PHOTO_STORAGE_KEY } from "@/lib/homeProfilePhoto";
import { parseHomeLayoutMedia, resolveHomeMediaUrl } from "@/lib/profile/homeMedia";
import { buildHomeApps, type HomeDashboardCounts } from "@/lib/home/homeApps";
import { resolveProfileDisplayName } from "@/lib/profile/displayName";

const WALLPAPER_KEY = "yb_home_wallpaper";

const EMPTY_COUNTS: HomeDashboardCounts = {
  beliefs: 0,
  tensions: 0,
  chats: 0,
  artifacts: 0,
  journalToday: 0,
  prayerWaiting: 0,
};

export function useHomeDashboardData() {
  const { user, profile } = useAuth();
  const [todayPrompt, setTodayPrompt] = useState<{ id: string; text: string } | null>(null);
  const [onThisDayCount, setOnThisDayCount] = useState(0);
  const [counts, setCounts] = useState<HomeDashboardCounts>(EMPTY_COUNTS);
  const [wallpaper, setWallpaper] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(WALLPAPER_KEY) : null,
  );
  const [wallpaperTint, setWallpaperTint] = useState(24);
  const [wallpaperBlur, setWallpaperBlur] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(HOME_PROFILE_PHOTO_STORAGE_KEY) : null,
  );

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

  useEffect(() => {
    if (!user) return;
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    (async () => {
      try {
      const [
        { data: prompts },
        { data: past },
        { count: beliefsCount },
        { count: tensionsCount },
        { count: chatsCount },
        { count: artsCount },
        { count: jTodayCount },
        { count: prayerWaitingCount },
      ] = await Promise.all([
        supabase.from("journal_prompts").select("id,text").limit(500),
        supabase
          .from("journal_entries")
          .select("entry_at_ts")
          .or("entry_kind.is.null,entry_kind.neq.vent")
          .lt("entry_at_ts", startOfDay.toISOString())
          .order("entry_at_ts", { ascending: false })
          .limit(500),
        supabase.from("belief_nodes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("belief_tensions" as never).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("chat_threads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("artifacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .or("entry_kind.is.null,entry_kind.neq.vent")
          .gte("entry_at_ts", startOfDay.toISOString()),
        supabase
          .from("prayer_requests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "waiting"),
      ]);
      const list = prompts ?? [];
      if (list.length) {
        const seed = today.getFullYear() * 1000 + Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
        const p = list[seed % list.length];
        setTodayPrompt({ id: p.id as string, text: p.text as string });
      }
      const m = today.getMonth();
      const d = today.getDate();
      setOnThisDayCount((past ?? []).filter((e: { entry_at_ts: string }) => {
        const dt = new Date(e.entry_at_ts);
        return dt.getMonth() === m && dt.getDate() === d;
      }).length);
      setCounts({
        beliefs: beliefsCount ?? 0,
        tensions: tensionsCount ?? 0,
        chats: chatsCount ?? 0,
        artifacts: artsCount ?? 0,
        journalToday: jTodayCount ?? 0,
        prayerWaiting: prayerWaitingCount ?? 0,
      });
      } catch {
        // Keep last-known counts; dashboard widgets still render.
      }
    })();
  }, [user]);

  const apps = useMemo(() => buildHomeApps(counts), [counts]);

  const displayName = resolveProfileDisplayName(profile, user);

  return {
    todayPrompt,
    onThisDayCount,
    counts,
    apps,
    wallpaper,
    wallpaperTint,
    wallpaperBlur,
    profilePhoto,
    displayName,
  };
}
