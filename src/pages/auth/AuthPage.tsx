import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

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
      </motion.div>
    </div>
  );
}
