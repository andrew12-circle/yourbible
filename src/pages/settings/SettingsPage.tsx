import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { FONT_CHOICES, scriptureFontFamily } from "@/lib/bible/fontChoices";
import { COVERS, PALETTES } from "@/lib/bible/palettes";
import { LeatherCoverCard } from "@/components/bible/LeatherCoverCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, ImagePlus, User, SlidersHorizontal, Languages } from "lucide-react";
import { listBibles, type BibleEntry } from "@/lib/bible/api";
import { LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import { toast } from "@/hooks/use-toast";
import { MarkerSvgFilter } from "@/components/bible/MarkerSvgFilter";
import { HOME_PROFILE_PHOTO_STORAGE_KEY } from "@/lib/homeProfilePhoto";
import {
  parseHomeLayoutMedia,
  parseHomeMode,
  resolveHomeMediaUrl,
  uploadHomeProfilePhoto,
  uploadHomeWallpaper,
  type HomeMode,
} from "@/lib/profile/homeMedia";
import { APP_NAME } from "@/lib/appBrand";
import { SeedTimelineCard } from "@/components/settings/SeedTimelineCard";
import { AiUsageSection } from "@/components/settings/AiUsageSection";
import { YouTubeConnectionSection } from "@/components/settings/YouTubeConnectionSection";
import { YouTubeSubscriptionsSection } from "@/components/settings/YouTubeSubscriptionsSection";
import { PartnerSettingsSection } from "@/components/partner/PartnerSettingsSection";
import { hubShellPageRoot, hubShellScrollMain } from "@/lib/shell/hubShellClasses";

const WALLPAPER_KEY = "yb_home_wallpaper";

type HomeLayoutSettings = {
  homeWallpaper?: string;
  homeWallpaperTint?: number;
  homeWallpaperBlur?: number;
  homeProfilePhoto?: string;
  homeMode?: HomeMode;
};

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut, loading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const [_saving, setSaving] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(profile?.display_name ?? "");
  const [dobDraft, setDobDraft] = useState(profile?.date_of_birth ?? "");

  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [wallpaper, setWallpaper] = useState<string | null>(typeof window !== "undefined" ? localStorage.getItem(WALLPAPER_KEY) : null);
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

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!profile) return <div className="min-h-screen app-mesh flex items-center justify-center">Loading…</div>;

  const currentLayout = (() => {
    try {
      return JSON.parse(profile.layout || "{}") as HomeLayoutSettings;
    } catch {
      return {};
    }
  })();

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

  const previewPalette = PALETTES.find(p => p.id === profile.highlight_palette) ?? PALETTES[0];
  const initials = (profile.display_name || user?.email || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

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

  return (
    <div className={hubShellPageRoot(showHubShell, "min-h-screen app-mesh pb-safe-20", "h-full min-h-0 app-mesh")}>
      <MarkerSvgFilter />
      {!showHubShell ? (
      <header className="sticky top-0 z-20 bg-paper/80 backdrop-blur-md border-b border-paper-edge">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon" className="text-leather"><ChevronLeft className="w-5 h-5" /></Button></Link>
          <h1 className="font-display text-xl text-leather">{APP_NAME}</h1>
        </div>
      </header>
      ) : (
        <header className="flex h-14 shrink-0 items-center border-b border-paper-edge bg-paper/80 px-4">
          <h1 className="font-display text-lg text-leather">{APP_NAME}</h1>
        </header>
      )}

      <main className={hubShellScrollMain(showHubShell, "max-w-2xl mx-auto px-5 py-8 space-y-10")}>
        {/* Live preview */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-paper-edge bg-paper/60 overflow-hidden shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-gold-deep px-5 pt-4">Preview</div>
          <div
            className={`scripture-font-preview p-6 text-[18px] leading-[1.8] ${
              profile.font_choice === "serif"
                ? "font-scripture"
                : profile.font_choice === "sf"
                  ? "font-system reader-sf-body"
                  : ""
            }`}
            style={{
              fontFamily: scriptureFontFamily(profile.font_choice),
              ["--reader-scripture-font-family" as string]: scriptureFontFamily(profile.font_choice),
            }}
          >
            <div className="font-display text-2xl text-leather mb-3">John 3</div>
            <p>
              <span className="verse-num">16</span>
              <span className="marker-hl" style={{ ["--hl-color" as string]: `var(${previewPalette.colors[0].cssVar})` }}>
                <span className="marker-hl-text">
                  For God so loved the world that he gave his one and only Son,
                </span>
              </span>{" "}
              that whoever believes in him shall not perish but have eternal life.
            </p>
          </div>
        </motion.section>

        {/* Profile settings */}
        <section>
          <h2 className="font-display text-lg text-leather mb-3">Profile settings</h2>
          <div className="rounded-lg border border-paper-edge bg-paper/70 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => profilePhotoFileRef.current?.click()}
                className="w-16 h-16 rounded-full bg-leather/20 border border-paper-edge overflow-hidden flex items-center justify-center text-leather font-semibold"
                aria-label="Change profile photo"
              >
                {profilePhoto ? <img src={profilePhoto} alt="" className="w-full h-full object-cover" /> : initials || <User className="w-5 h-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-muted-foreground">Profile name</div>
                <input
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                  onBlur={() => { if ((profile.display_name ?? "") !== displayNameDraft) void save({ display_name: displayNameDraft }); }}
                  placeholder="Your name"
                />
              </div>
            </div>
            <div className="pt-1">
              <div className="text-sm text-muted-foreground">Birth date</div>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1">Used for “My life in weeks” on the home screen.</p>
              <input
                type="date"
                max={todayIso()}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={dobDraft}
                onChange={(e) => setDobDraft(e.target.value)}
                onBlur={() => {
                  const next = dobDraft.trim() ? dobDraft.trim() : null;
                  const prevRaw = profile.date_of_birth ?? null;
                  const prev = prevRaw != null && String(prevRaw).trim() !== "" ? String(prevRaw).trim() : null;
                  if (next !== prev) void save({ date_of_birth: next });
                }}
              />
              <Link to="/home" className="text-xs text-gold-deep hover:underline mt-1.5 inline-block">
                Open life in weeks on overview
              </Link>
            </div>
            <Button type="button" variant="outline" onClick={() => profilePhotoFileRef.current?.click()}>Change profile photo</Button>
            <div className="text-xs text-muted-foreground">Signed in as {user?.email}</div>
            <input
              ref={profilePhotoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadProfilePhoto(f); e.currentTarget.value = ""; }}
            />
          </div>
        </section>

        {/* Bible settings */}
        <section>
          <h2 className="font-display text-lg text-leather mb-3">Bible settings</h2>
          <label className="flex items-center gap-2 max-w-md rounded-lg border border-paper-edge bg-paper/60 px-3 py-2">
            <Languages className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="text-xs text-muted-foreground shrink-0">Translation</span>
            <select
              value={bibleId}
              onChange={(e) => {
                setBibleId(e.target.value);
                localStorage.setItem(LS_BIBLE_KEY, e.target.value);
                toast({ title: "Translation updated", description: "Applies when you open the reader." });
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-leather focus:outline-none"
              aria-label="Default Bible translation"
            >
              {bibles.length === 0 && <option value="">Loading…</option>}
              {bibles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.abbreviation} — {b.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* Cover */}
        <section>
          <h2 className="font-display text-lg text-leather mb-3">Cover</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {COVERS.map(c => (
              <LeatherCoverCard
                key={c.id}
                cover={c}
                selected={profile.cover === c.id}
                onClick={() => save({ cover: c.id })}
                layout="compact"
                className="rounded-md"
              />
            ))}
          </div>
        </section>

        {/* Highlight palette */}
        <section>
          <h2 className="font-display text-lg text-leather mb-3">Highlight palette</h2>
          <div className="space-y-2">
            {PALETTES.map(p => (
              <button key={p.id} onClick={() => save({ highlight_palette: p.id })}
                className={`w-full p-3 rounded-md border-2 flex items-center justify-between transition-all bg-paper/70 ${profile.highlight_palette === p.id ? "border-gold shadow-gold" : "border-paper-edge"}`}>
                <div className="text-left">
                  <div className="font-display text-leather">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.tagline}</div>
                </div>
                <div className="flex gap-1.5">
                  {p.colors.map(c => <div key={c.name} className="w-6 h-6 rounded-full" style={{ background: `hsl(var(${c.cssVar}))` }} />)}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Font */}
        <section>
          <h2 className="font-display text-lg text-leather mb-3">Scripture font</h2>
          <div className="grid grid-cols-3 gap-2">
            {FONT_CHOICES.map(f => (
              <button key={f.id} onClick={() => save({ font_choice: f.id })}
                className={`p-4 rounded-md border-2 text-center transition-all bg-paper/70 ${profile.font_choice === f.id ? "border-gold" : "border-paper-edge"}`}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
                <div className={`text-xl mt-1 ${f.previewClass}`}>For God so loved</div>
                <div className="text-[10px] text-muted-foreground mt-1">{f.sample}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Page tone */}
        <section>
          <h2 className="font-display text-lg text-leather mb-3">Page tone</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "cream", label: "Cream", swatch: "hsl(40 42% 93%)" },
              { id: "warm", label: "Warm white", swatch: "hsl(38 28% 96%)" },
            ].map(t => (
              <button key={t.id} onClick={() => save({ page_tone: t.id })}
                className={`p-5 rounded-md border-2 transition-all ${profile.page_tone === t.id ? "border-gold" : "border-paper-edge"}`}
                style={{ background: t.swatch }}>
                <div className="text-leather font-display">{t.label}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg text-leather mb-3">Background settings</h2>
          <div className="rounded-lg border border-paper-edge bg-paper/70 p-4 space-y-4 mb-4">
            <div>
              <div className="font-display text-leather mb-1">Home style</div>
              <div className="text-xs text-muted-foreground mb-3">
                App screen uses the iOS launcher. Command center adds a desktop sidebar and mini phone (mobile always uses App screen).
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "ios" as const, label: "App screen", hint: "iOS home" },
                  { id: "hub" as const, label: "Command center", hint: "Desktop hub" },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => void saveHomeLayout({ homeMode: opt.id })}
                    className={`p-4 rounded-md border-2 text-left transition-all ${
                      parseHomeMode(profile.layout) === opt.id ? "border-gold bg-paper-warm/80" : "border-paper-edge"
                    }`}
                  >
                    <div className="font-display text-leather">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-paper-edge bg-paper/70 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-md border border-paper-edge bg-paper-warm overflow-hidden flex items-center justify-center">
                  {wallpaper ? <img src={wallpaper} alt="Current background" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div>
                  <div className="font-display text-leather">Home background</div>
                  <div className="text-xs text-muted-foreground">Choose a photo for your main screen.</div>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => wallpaperFileRef.current?.click()}>Change</Button>
            </div>
            <div className="rounded-md border border-paper-edge bg-background/55 p-3">
              <div className="flex items-center gap-2 text-sm font-display text-leather mb-3">
                <SlidersHorizontal className="w-4 h-4" />
                Background appearance
              </div>
              <label className="block text-xs text-muted-foreground mb-1">Tint</label>
              <input type="range" min={0} max={60} value={wallpaperTint} onChange={(e) => {
                const v = Number(e.target.value); setWallpaperTint(v); saveWallpaperPresentation(v, wallpaperBlur);
              }} className="w-full" />
              <label className="block text-xs text-muted-foreground mt-3 mb-1">Blur</label>
              <input type="range" min={0} max={14} value={wallpaperBlur} onChange={(e) => {
                const v = Number(e.target.value); setWallpaperBlur(v); saveWallpaperPresentation(wallpaperTint, v);
              }} className="w-full" />
            </div>
          </div>
          <input
            ref={wallpaperFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadWallpaper(f); e.currentTarget.value = ""; }}
          />
        </section>

        <PartnerSettingsSection />

        <YouTubeConnectionSection />

        <YouTubeSubscriptionsSection />

        <AiUsageSection userId={user?.id} />

        <section>
          <h2 className="font-display text-lg text-leather mb-3">Knowledge base</h2>
          {user?.id ? <SeedTimelineCard userId={user.id} /> : null}
        </section>

        <div className="pt-8 border-t border-paper-edge flex items-center justify-between">
          <div>
            <div className="font-display text-leather">{profile.display_name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <Button variant="ghost" onClick={signOut} className="text-leather"><LogOut className="w-4 h-4 mr-2" />Sign out</Button>
        </div>
      </main>
    </div>
  );
}
