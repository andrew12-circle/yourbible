import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { COVERS, PALETTES } from "@/lib/bible/palettes";
import { LeatherCoverCard } from "@/components/bible/LeatherCoverCard";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Check, NotebookPen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { APP_NAME } from "@/lib/appBrand";
import { markBetaWelcomePending } from "@/lib/beta/welcome";
import { OnboardingJournalPrivacyStep } from "@/components/onboarding/OnboardingJournalPrivacyStep";
import { ensurePrivateJournal } from "@/lib/journal/privateJournal";

const STEPS = 4;

const SPACES = [
  {
    icon: BookOpen,
    title: "Reader",
    description: "A beautiful Bible with highlights, notes, and ribbons. Pick a translation anytime in the reader.",
  },
  {
    icon: NotebookPen,
    title: "Journal",
    description: "Daily prompts, life chapters, and a Private notebook encrypted like Day One.",
  },
  {
    icon: Brain,
    title: "Framework",
    description: "Map beliefs, tensions, and influences — your faith in your own words.",
  },
] as const;

export default function OnboardingPage() {
  const { user, profile, updateProfile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [cover, setCover] = useState(profile?.cover ?? "cordovan");
  const [palette, setPalette] = useState(profile?.highlight_palette ?? "classic");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <motion.div className="flex min-h-[100dvh] items-center justify-center pb-[max(1.5rem,var(--safe-area-inset-bottom))] pt-[max(1.5rem,var(--safe-area-inset-top))] app-mesh">
        <motion.div className="text-sm text-muted-foreground">Loading…</motion.div>
      </motion.div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.onboarded) return <Navigate to="/home" replace />;

  const finish = async () => {
    setBusy(true);
    try {
      if (!profile) await refreshProfile();
      await ensurePrivateJournal(user.id);
      const { error, profile: saved } = await updateProfile({
        cover,
        highlight_palette: palette,
        onboarded: true,
      });
      if (error) {
        toast({ variant: "destructive", title: "Couldn't finish setup", description: error.message });
        return;
      }
      if (!saved?.onboarded) {
        toast({
          variant: "destructive",
          title: "Couldn't finish setup",
          description: "Your profile didn't save. Check your connection and try again.",
        });
        return;
      }
      toast({ title: "You're all set", description: `${APP_NAME} is ready whenever you are.` });
      markBetaWelcomePending();
      navigate("/home", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 pb-[max(2.5rem,var(--safe-area-inset-bottom))] pt-[max(2.5rem,var(--safe-area-inset-top))] app-mesh">
      <motion.div className="w-full max-w-2xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <motion.div className="flex items-center justify-center gap-2 mb-10">
          {Array.from({ length: STEPS }, (_, i) => (
            <motion.div
              key={i}
              layout
              className={`h-1 rounded-full transition-all ${i <= step ? "bg-leather w-12" : "bg-paper-edge w-8"}`}
            />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Welcome</p>
              <h2 className="font-display text-3xl text-leather text-center mb-2">{APP_NAME}</h2>
              <p className="text-center text-muted-foreground text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Scripture, journaling, and a framework for your faith — one home for the sacred and the everyday.
              </p>

              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              >
                {SPACES.map(({ icon: Icon, title, description }) => (
                  <motion.div
                    key={title}
                    variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                    className="flex gap-4 p-4 rounded-xl border border-paper-edge bg-paper/70"
                  >
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-leather/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-leather" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="font-display text-lg text-leather">{title}</div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Next: personalize your reader, then protect your journal with encryption.
              </p>

              <div className="flex justify-end mt-8">
                <Button onClick={() => setStep(1)} className="leather-texture text-gold-bright shadow-leather border border-gold/30 px-8">
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="cover"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="font-display text-3xl text-leather text-center mb-2">Your reader cover</h2>
              <p className="text-center text-muted-foreground text-sm mb-8">
                How your Bible looks when you open the reader. Translation is chosen in the reader menu.
              </p>

              <motion.div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[min(52vh,520px)] overflow-y-auto pr-1 -mr-1">
                {COVERS.map(c => (
                  <LeatherCoverCard
                    key={c.id}
                    cover={c}
                    selected={cover === c.id}
                    onClick={() => setCover(c.id)}
                    layout="full"
                  />
                ))}
              </motion.div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" type="button" onClick={() => setStep(0)}>Back</Button>
                <Button type="button" onClick={() => setStep(2)} className="leather-texture text-gold-bright shadow-leather border border-gold/30 px-8">
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.4 }}
            >
              <OnboardingJournalPrivacyStep
                onBack={() => setStep(1)}
                onContinue={() => setStep(3)}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="palette"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="font-display text-3xl text-leather text-center mb-2">Highlight palette</h2>
              <p className="text-center text-muted-foreground text-sm mb-8">Colors for marking verses — rename and reassign later.</p>

              <div className="space-y-4">
                {PALETTES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPalette(p.id)}
                    className={`w-full text-left p-5 rounded-lg border-2 transition-all bg-paper/70 ${palette === p.id ? "border-gold shadow-gold" : "border-paper-edge hover:border-leather/30"}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-display text-xl text-leather">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.tagline}</div>
                      </div>
                      {palette === p.id && (
                        <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-leather-deep" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {p.colors.map(col => (
                        <motion.div key={col.name} className="flex-1 h-7 rounded" style={{ background: `hsl(var(${col.cssVar}))` }} title={col.name} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" type="button" onClick={() => setStep(2)}>Back</Button>
                <Button type="button" disabled={busy} onClick={finish} className="leather-texture text-gold-bright shadow-leather border border-gold/30 px-8">
                  {busy ? "Setting up…" : `Enter ${APP_NAME}`}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
