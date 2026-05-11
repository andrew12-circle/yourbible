import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { COVERS, PALETTES } from "@/lib/bible/palettes";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MarkerSvgFilter } from "@/components/bible/MarkerSvgFilter";

export default function SettingsPage() {
  const { user, profile, updateProfile, signOut, loading } = useAuth();
  const [saving, setSaving] = useState(false);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!profile) return <div className="min-h-screen app-mesh flex items-center justify-center">Loading…</div>;

  const save = async (patch: Parameters<typeof updateProfile>[0]) => {
    setSaving(true);
    await updateProfile(patch);
    setSaving(false);
    toast({ title: "Saved" });
  };

  const previewPalette = PALETTES.find(p => p.id === profile.highlight_palette) ?? PALETTES[0];

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
          <div className="p-6 font-scripture text-[18px] leading-[1.8]" style={{ fontFamily: profile.font_choice === "sans" ? "Inter, sans-serif" : undefined }}>
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
