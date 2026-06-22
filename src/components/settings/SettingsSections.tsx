import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ImagePlus, Languages, LogOut, SlidersHorizontal, User } from "lucide-react";
import AiWritingAssistToggle from "@/components/writing/AiWritingAssistToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LeatherCoverCard } from "@/components/bible/LeatherCoverCard";
import { MarkerSvgFilter } from "@/components/bible/MarkerSvgFilter";
import { FONT_CHOICES, scriptureFontFamily } from "@/lib/bible/fontChoices";
import { COVERS, PALETTES } from "@/lib/bible/palettes";
import { parseHomeMode } from "@/lib/profile/homeMedia";
import { cn } from "@/lib/utils";
import { todayIso, useSettingsPage } from "@/hooks/useSettingsPage";
import { SettingsCard } from "@/components/settings/SettingsSectionPanel";
import { SettingsOfflineBible } from "@/components/settings/SettingsOfflineBible";
import { readBibleLanguage, LS_BIBLE_LANGUAGE_KEY } from "@/hooks/useBibles";
import { EOTC_BIBLE_ID, readCanon, writeCanon, type CanonId } from "@/lib/bible/canon";
import { LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";

type SettingsState = ReturnType<typeof useSettingsPage>;

export function SettingsProfileSection({
  state,
  onSignOut,
}: {
  state: SettingsState;
  onSignOut: () => void;
}) {
  const { user, profile, displayNameDraft, setDisplayNameDraft, dobDraft, setDobDraft, profilePhoto, profilePhotoFileRef, onUploadProfilePhoto, saveDisplayName, saveBirthDate, initials } = state;

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <SettingsCard className="overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-5 bg-gradient-to-br from-muted/40 to-transparent border-b">
          <button
            type="button"
            onClick={() => profilePhotoFileRef.current?.click()}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted flex items-center justify-center text-xl font-semibold text-foreground transition hover:border-primary/40"
            aria-label="Change profile photo"
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
            ) : initials ? (
              initials
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              Change
            </span>
          </button>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lg font-semibold tracking-tight truncate">
              {profile.display_name?.trim() || "Your profile"}
            </p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => profilePhotoFileRef.current?.click()}
            >
              Upload photo
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <div className="space-y-2">
            <Label htmlFor="settings-display-name">Display name</Label>
            <Input
              id="settings-display-name"
              value={displayNameDraft}
              onChange={(e) => setDisplayNameDraft(e.target.value)}
              onBlur={saveDisplayName}
              placeholder="Your name"
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-dob">Birth date</Label>
            <p className="text-xs text-muted-foreground">Powers “My life in weeks” on your overview.</p>
            <Input
              id="settings-dob"
              type="date"
              max={todayIso()}
              value={dobDraft}
              onChange={(e) => setDobDraft(e.target.value)}
              onBlur={saveBirthDate}
              className="rounded-lg"
            />
            <Link to="/home" className="inline-block text-xs font-medium text-primary hover:underline">
              Open life in weeks on overview →
            </Link>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard className="space-y-3">
        <div>
          <p className="text-sm font-medium">AI writing assist</p>
          <p className="text-xs text-muted-foreground mt-1">
            Off by default. When on, spelling and grammar are lightly corrected after you pause — journal text is sent to
            AI for that step. Dictation formatting stays on your device.
          </p>
        </div>
        <AiWritingAssistToggle />
      </SettingsCard>

      <SettingsCard className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Sign out</p>
          <p className="text-xs text-muted-foreground mt-0.5">End your session on this device.</p>
        </div>
        <Button type="button" variant="outline" onClick={onSignOut} className="gap-2 shrink-0">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </SettingsCard>

      <input
        ref={profilePhotoFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onUploadProfilePhoto(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

export function SettingsReaderSection({ state }: { state: SettingsState }) {
  const { profile, bibles, bibleId, onBibleChange } = state;
  if (!profile) return null;

  const previewPalette = PALETTES.find((p) => p.id === profile.highlight_palette) ?? PALETTES[0];
  const bibleLanguage = readBibleLanguage();
  const bibleCanon = readCanon();

  return (
    <div className="space-y-4">
      <SettingsCard>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <Languages className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="settings-bible-canon">Bible canon</Label>
            <p className="text-xs text-muted-foreground">
              Ethiopian Orthodox includes 81 books (Enoch, Jubilees, Meqabyan, and more) in Amharic.
            </p>
            <select
              id="settings-bible-canon"
              value={bibleCanon}
              onChange={(e) => {
                const next = e.target.value as CanonId;
                writeCanon(next);
                if (next === "ethiopian") {
                  localStorage.setItem(LS_BIBLE_KEY, EOTC_BIBLE_ID);
                }
                window.location.reload();
              }}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="protestant">Protestant (66 books)</option>
              <option value="ethiopian">Ethiopian Orthodox (81 books, Amharic)</option>
            </select>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <Languages className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="settings-bible-lang">Bible language</Label>
            <select
              id="settings-bible-lang"
              value={bibleLanguage}
              onChange={(e) => {
                localStorage.setItem(LS_BIBLE_LANGUAGE_KEY, e.target.value);
                window.location.reload();
              }}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="eng">English</option>
              <option value="spa">Spanish</option>
              <option value="fra">French</option>
              <option value="deu">German</option>
              <option value="por">Portuguese</option>
              <option value="all">All languages</option>
            </select>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <Languages className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="settings-bible">Default translation</Label>
            <select
              id="settings-bible"
              value={bibleId}
              onChange={(e) => onBibleChange(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Default Bible translation"
            >
              {bibles.length === 0 && <option value="">Loading…</option>}
              {bibles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.abbreviation} — {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard className="overflow-hidden p-0">
        <div className="border-b px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Live preview</p>
        </div>
        <MarkerSvgFilter />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "scripture-font-preview p-5 md:p-6 text-[17px] leading-[1.8]",
            profile.font_choice === "serif"
              ? "font-scripture"
              : profile.font_choice === "sf"
                ? "font-system reader-sf-body"
                : "",
          )}
          style={{
            fontFamily: scriptureFontFamily(profile.font_choice),
            ["--reader-scripture-font-family" as string]: scriptureFontFamily(profile.font_choice),
          }}
        >
          <div className="font-display text-2xl text-foreground mb-3">John 3</div>
          <p>
            <span className="verse-num">16</span>
            <span className="marker-hl" style={{ ["--hl-color" as string]: `var(${previewPalette.colors[0].cssVar})` }}>
              <span className="marker-hl-text">
                For God so loved the world that he gave his one and only Son,
              </span>
            </span>{" "}
            that whoever believes in him shall not perish but have eternal life.
          </p>
        </motion.div>
      </SettingsCard>

      <SettingsOfflineBible bibleId={bibleId} />
    </div>
  );
}

export function SettingsAppearanceSection({ state }: { state: SettingsState }) {
  const { profile, save } = state;
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Book cover</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {COVERS.map((c) => (
            <LeatherCoverCard
              key={c.id}
              cover={c}
              selected={profile.cover === c.id}
              onClick={() => void save({ cover: c.id })}
              layout="compact"
              className="rounded-lg"
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Highlight palette</Label>
        <div className="space-y-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void save({ highlight_palette: p.id })}
              className={cn(
                "w-full rounded-xl border p-3 flex items-center justify-between transition-all bg-card hover:bg-muted/30",
                profile.highlight_palette === p.id ? "border-primary ring-1 ring-primary/20" : "border-border",
              )}
            >
              <div className="text-left">
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.tagline}</div>
              </div>
              <div className="flex gap-1.5">
                {p.colors.map((c) => (
                  <div
                    key={c.name}
                    className="w-6 h-6 rounded-full border border-border/50"
                    style={{ background: `hsl(var(${c.cssVar}))` }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Scripture font</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {FONT_CHOICES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => void save({ font_choice: f.id })}
              className={cn(
                "rounded-xl border p-4 text-center transition-all bg-card hover:bg-muted/30",
                profile.font_choice === f.id ? "border-primary ring-1 ring-primary/20" : "border-border",
              )}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
              <div className={cn("text-lg mt-1", f.previewClass)}>For God so loved</div>
              <div className="text-[10px] text-muted-foreground mt-1">{f.sample}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Page tone</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "cream", label: "Cream", swatch: "hsl(40 42% 93%)" },
            { id: "warm", label: "Warm white", swatch: "hsl(38 28% 96%)" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void save({ page_tone: t.id })}
              className={cn(
                "rounded-xl border-2 p-5 text-left transition-all",
                profile.page_tone === t.id ? "border-primary ring-1 ring-primary/20" : "border-border",
              )}
              style={{ background: t.swatch }}
            >
              <div className="font-medium text-foreground">{t.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsHomeSection({ state }: { state: SettingsState }) {
  const {
    profile,
    wallpaper,
    wallpaperTint,
    setWallpaperTint,
    wallpaperBlur,
    setWallpaperBlur,
    wallpaperFileRef,
    onUploadWallpaper,
    saveHomeLayout,
    saveWallpaperPresentation,
  } = state;

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <SettingsCard className="space-y-4">
        <div>
          <Label>Home style</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Command center is the default. App screen uses the iOS launcher instead.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([
              { id: "hub" as const, label: "Command center", hint: "Sidebar overview and mini phone (default)" },
              { id: "ios" as const, label: "App screen", hint: "iOS home launcher" },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => void saveHomeLayout({ homeMode: opt.id })}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all hover:bg-muted/30",
                  parseHomeMode(profile.layout) === opt.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card",
                )}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted flex items-center justify-center">
              {wallpaper ? (
                <img src={wallpaper} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Home wallpaper</p>
              <p className="text-xs text-muted-foreground">Background photo for your main screen.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => wallpaperFileRef.current?.click()}>
            Change
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Background appearance
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <Label>Tint</Label>
              <span>{wallpaperTint}</span>
            </div>
            <Slider
              min={0}
              max={60}
              step={1}
              value={[wallpaperTint]}
              onValueChange={([v]) => {
                setWallpaperTint(v);
                saveWallpaperPresentation(v, wallpaperBlur);
              }}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <Label>Blur</Label>
              <span>{wallpaperBlur}px</span>
            </div>
            <Slider
              min={0}
              max={14}
              step={1}
              value={[wallpaperBlur]}
              onValueChange={([v]) => {
                setWallpaperBlur(v);
                saveWallpaperPresentation(wallpaperTint, v);
              }}
            />
          </div>
        </div>
      </SettingsCard>

      <input
        ref={wallpaperFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onUploadWallpaper(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
