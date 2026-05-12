import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { COVERS, PALETTES } from "@/lib/bible/palettes";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Check, ImagePlus, User, SlidersHorizontal } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MarkerSvgFilter } from "@/components/bible/MarkerSvgFilter";
import { HOME_PROFILE_PHOTO_STORAGE_KEY } from "@/lib/homeProfilePhoto";
import { SeedTimelineCard } from "@/components/settings/SeedTimelineCard";
import { PartnerSettingsSection } from "@/components/partner/PartnerSettingsSection";

const WALLPAPER_KEY = "yb_home_wallpaper";

type HomeLayoutSettings = {
  homeWallpaper?: string;
  homeWallpaperTint?: number;
  homeWallpaperBlur?: number;
  homeProfilePhoto?: string;
};

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut, loading } = useAuth();
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    setDobDraft(profile?.date_of_birth ?? "");
  }, [profile?.date_of_birth]);

  useEffect(() => {
    if (!profile?.layout) return;
    try {
      const parsed = JSON.parse(profile.layout) as HomeLayoutSettings;
      if (parsed.homeWallpaper) {
        setWallpaper(parsed.homeWallpaper);
        localStorage.setItem(WALLPAPER_KEY, parsed.homeWallpaper);
      }
      if (parsed.homeProfilePhoto) {
        setProfilePhoto(parsed.homeProfilePhoto);
        localStorage.setItem(HOME_PROFILE_PHOTO_STORAGE_KEY, parsed.homeProfilePhoto);
      }
      if (typeof parsed.homeWallpaperTint === "number") setWallpaperTint(parsed.homeWallpaperTint);
      if (typeof parsed.homeWallpaperBlur === "number") setWallpaperBlur(parsed.homeWallpaperBlur);
    } catch {
      // Ignore legacy layout values that are not JSON.
    }
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

  const onUploadWallpaper = (file: File) => {
    if (file.size > 100 * 1024 * 1024) { toast({ title: "Image too large", description: "Max size is 100 MB." }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      try {
        localStorage.setItem(WALLPAPER_KEY, url);
        setWallpaper(url);
        void saveHomeLayout({ homeWallpaper: url });
      } catch {
        toast({ title: "Applied temporarily", description: "Image is too large to save on this device." });
      }
    };
    reader.readAsDataURL(file);
  };

  const onUploadProfilePhoto = (file: File) => {
    if (file.size > 20 * 1024 * 1024) { toast({ title: "Image too large", description: "Max size is 20 MB." }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      try {
        localStorage.setItem(HOME_PROFILE_PHOTO_STORAGE_KEY, url);
        setProfilePhoto(url);
        void saveHomeLayout({ homeProfilePhoto: url });
      } catch {
        toast({ title: "Applied temporarily", description: "Image is too large to save on this device." });
      }
    };
    reader.readAsDataURL(file);
  };

  const saveWallpaperPresentation = (nextTint: number, nextBlur: number) => {
    void saveHomeLayout({ homeWallpaperTint: nextTint, homeWallpaperBlur: nextBlur });
  };

  return (
    <div className="min-h-screen app-mesh pb-20">
      <MarkerSvgFilter />
      <header className="sticky top-0 z-20 bg-paper/80 backdrop-blur-md border-b border-paper-edge">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon" className="text-leather"><ChevronLeft className="w-5 h-5" /></Button></Link>
          <h1 className="font-display text-xl text-leather">My Bible</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-10">
        {/* Live preview */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-paper-edge bg-paper/60 overflow-hidden shadow-soft">
          <div className="text-[10px] uppercase tracking-widest text-gold-deep px-5 pt-4">Preview</div>
          <div
            className="p-6 font-scripture text-[18px] leading-[1.8]"
            style={{
              fontFamily:
                profile.font_choice === "sans"
                  ? "Inter, sans-serif"
                  : profile.font_choice === "sf"
                  ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif'
                  : undefined,
            }}
          >
            <div className="font-display text-2xl text-leather mb-3">John 3</div>
            <p>
              <span className="verse-num">16</span>
              <span className="marker-hl" style={{ ["--hl-color" as string]: `var(${previewPalette.colors[0].cssVar})` }}>
                For God so loved the world that he gave his one and only Son,
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
              <Link to="/life-weeks" className="text-xs text-gold-deep hover:underline mt-1.5 inline-block">
                Open life in weeks poster
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
        </section>

        {/* Cover */}
        <section>
          <h2 className="font-display text-lg text-leather mb-3">Cover</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COVERS.map(c => (
              <button key={c.id} onClick={() => save({ cover: c.id })}
                className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 transition-all ${profile.cover === c.id ? "border-gold shadow-gold" : "border-paper-edge"}`}
                style={{ background: c.swatch }}>
                <div className="absolute inset-1.5 border border-gold/40 rounded-sm" />
                <div className="absolute bottom-1 left-2 text-[10px] text-gold-bright font-display">{c.label}</div>
                {profile.cover === c.id && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center"><Check className="w-3 h-3 text-leather-deep" strokeWidth={3} /></div>}
              </button>
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
            {[
              { id: "serif", label: "Serif", sample: "Cormorant Garamond" },
              { id: "sans", label: "Sans", sample: "Inter" },
              { id: "sf", label: "San Francisco", sample: "SF Pro" },
            ].map(f => (
              <button key={f.id} onClick={() => save({ font_choice: f.id })}
                className={`p-4 rounded-md border-2 text-center transition-all bg-paper/70 ${profile.font_choice === f.id ? "border-gold" : "border-paper-edge"}`}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
                <div className={`text-xl mt-1 ${f.id === "serif" ? "font-scripture" : f.id === "sf" ? "font-system" : "font-sans"}`}>For God so loved</div>
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
