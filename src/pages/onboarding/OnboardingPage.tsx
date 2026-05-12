import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { COVERS, PALETTES } from "@/lib/bible/palettes";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const { user, profile, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [cover, setCover] = useState(profile?.cover ?? "cordovan");
  const [palette, setPalette] = useState(profile?.highlight_palette ?? "classic");
  const [busy, setBusy] = useState(false);

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!loading && profile?.onboarded) return <Navigate to="/" replace />;

  const finish = async () => {
    setBusy(true);
    const { error } = await updateProfile({ cover, highlight_palette: palette, onboarded: true });
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't finish setup", description: error.message });
      return;
    }
    toast({ title: "Your Bible is ready", description: "Open it whenever you'd like." });
    navigate("/");
  };

  return (
    <div className="min-h-screen app-mesh flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[0, 1].map(i => (
            <div key={i} className={`h-1 w-12 rounded-full transition-colors ${i <= step ? "bg-leather" : "bg-paper-edge"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="cover" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.4 }}>
              <h2 className="font-display text-3xl text-leather text-center mb-2">Choose your cover</h2>
              <p className="text-center text-muted-foreground text-sm mb-8">A Bible should feel like yours from the moment you open it.</p>

              <div className="grid grid-cols-2 gap-5">
                {COVERS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCover(c.id)}
                    className={`group relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${cover === c.id ? "border-gold shadow-gold scale-[1.02]" : "border-paper-edge"}`}
                    style={{ background: c.swatch }}
                  >
                    {/* Gold edge frame */}
                    <div className="absolute inset-2 border border-gold/40 rounded" />
                    <div className="absolute inset-0 flex items-end p-4 bg-gradient-to-t from-black/50 to-transparent">
                      <div className="text-left">
                        <div className="text-gold-bright font-display text-lg">{c.label}</div>
                        <div className="text-white/70 text-xs">{c.tagline}</div>
                      </div>
                    </div>
                    {cover === c.id && (
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gold flex items-center justify-center">
                        <Check className="w-4 h-4 text-leather-deep" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-end mt-8">
                <Button onClick={() => setStep(1)} className="leather-texture text-gold-bright shadow-leather border border-gold/30 px-8">Continue</Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="palette" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.4 }}>
              <h2 className="font-display text-3xl text-leather text-center mb-2">Choose a highlight palette</h2>
              <p className="text-center text-muted-foreground text-sm mb-8">You can name and reassign each color later.</p>

              <div className="space-y-4">
                {PALETTES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    className={`w-full text-left p-5 rounded-lg border-2 transition-all bg-paper/70 ${palette === p.id ? "border-gold shadow-gold" : "border-paper-edge hover:border-leather/30"}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-display text-xl text-leather">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.tagline}</div>
                      </div>
                      {palette === p.id && (
                        <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center"><Check className="w-3.5 h-3.5 text-leather-deep" strokeWidth={3} /></div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {p.colors.map(col => (
                        <div key={col.name} className="flex-1 h-7 rounded" style={{ background: `hsl(var(${col.cssVar}))` }} title={col.name} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button disabled={busy} onClick={finish} className="leather-texture text-gold-bright shadow-leather border border-gold/30 px-8">
                  {busy ? "Setting up…" : "Open my Bible"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
