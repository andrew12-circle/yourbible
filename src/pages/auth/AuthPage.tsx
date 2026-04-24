import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";

export default function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const signInWithApple = async () => {
    setAppleBusy(true);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setAppleBusy(false);
      toast({ variant: "destructive", title: "Couldn't sign in with Apple", description: result.error.message });
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signin" ? signIn(email, password) : signUp(email, password, name);
    const { error } = await fn;
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't continue", description: error.message });
      return;
    }
    if (mode === "signup") {
      toast({ title: "Welcome", description: "Let's set up your Bible." });
      navigate("/onboarding");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 paper-texture relative overflow-hidden">
      {/* Decorative gold edges */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full leather-texture shadow-leather mb-5">
            <BookOpen className="w-7 h-7 text-gold-bright" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-4xl text-leather mb-2">Your Bible</h1>
          <p className="text-muted-foreground text-sm">A Bible that feels like yours.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 bg-paper/60 backdrop-blur p-7 rounded-lg border border-paper-edge shadow-soft">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane" autoComplete="name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-11 leather-texture text-gold-bright hover:text-gold-bright shadow-leather border border-gold/30">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "Open my Bible" : "Begin"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-muted-foreground hover:text-leather transition-colors pt-2"
          >
            {mode === "signin" ? "New here? Create an account." : "Already have an account? Sign in."}
          </button>
        </form>

        <div className="mt-5">
          <div className="relative flex items-center my-4">
            <div className="flex-1 h-px bg-paper-edge" />
            <span className="px-3 text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-paper-edge" />
          </div>
          <button
            type="button"
            onClick={signInWithApple}
            disabled={appleBusy}
            className="w-full h-11 rounded-md bg-black text-white flex items-center justify-center gap-2 hover:bg-black/90 transition-colors disabled:opacity-60"
          >
            {appleBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                  <path d="M16.365 12.96c-.02-2.18 1.78-3.23 1.86-3.28-1.01-1.48-2.59-1.68-3.15-1.7-1.34-.13-2.61.79-3.29.79-.69 0-1.73-.77-2.85-.75-1.46.02-2.81.85-3.56 2.16-1.52 2.64-.39 6.55 1.09 8.7.72 1.05 1.58 2.23 2.7 2.19 1.09-.04 1.5-.7 2.81-.7 1.31 0 1.68.7 2.83.68 1.17-.02 1.91-1.07 2.62-2.13.83-1.22 1.17-2.41 1.19-2.47-.03-.01-2.28-.87-2.31-3.49zM14.2 6.27c.6-.73 1.01-1.74.9-2.75-.87.04-1.93.58-2.55 1.31-.55.64-1.04 1.68-.91 2.66.97.07 1.96-.49 2.56-1.22z"/>
                </svg>
                <span className="text-sm font-medium">Continue with Apple</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
