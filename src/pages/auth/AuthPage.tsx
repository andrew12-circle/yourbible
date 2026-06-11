import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { postAuthPath } from "@/lib/auth/onboardingGate";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/appBrand";

function safeAppNext(raw: string | null): string | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  return decoded;
}

export default function AuthPage() {
  const { user, profile, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextTarget = useMemo(() => safeAppNext(params.get("next")), [params]);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  if (!loading && user) return <Navigate to={postAuthPath(profile, nextTarget)} replace />;

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

  const signInWithGoogle = async () => {
    setGoogleBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleBusy(false);
      toast({ variant: "destructive", title: "Couldn't sign in with Google", description: result.error.message });
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "signin") {
      const { error, profile: signedInProfile } = await signIn(email, password);
      setBusy(false);
      if (error) {
        toast({ variant: "destructive", title: "Couldn't continue", description: error.message });
        return;
      }
      navigate(postAuthPath(signedInProfile, nextTarget));
      return;
    }

    const { error, sessionCreated } = await signUp(email, password, name);
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't continue", description: error.message });
      return;
    }
    if (!sessionCreated) {
      toast({
        title: "Check your email",
        description: "Confirm your address, then sign in to finish setup.",
      });
      setMode("signin");
      return;
    }
    toast({ title: "Welcome", description: `Let's set up ${APP_NAME}.` });
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 app-mesh relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <img
            src="/app-icon-192.png"
            srcSet="/app-icon-192.png 96w, /app-icon-512.png 192w"
            sizes="80px"
            alt=""
            width={80}
            height={80}
            decoding="async"
            className="mx-auto mb-5 h-20 w-20 rounded-[26px] object-contain shadow-[0_18px_40px_-12px_rgba(15,23,42,0.22)] ring-1 ring-black/[0.06]"
          />
          <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-1">{APP_NAME}</h1>
          <p className="text-muted-foreground text-[15px]">{APP_DESCRIPTION}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 bg-white/85 backdrop-blur-xl p-7 rounded-3xl border border-white/70 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.18)]">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane" autoComplete="name" className="h-11 rounded-xl bg-secondary border-transparent" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="h-11 rounded-xl bg-secondary border-transparent" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} className="h-11 rounded-xl bg-secondary border-transparent" />
          </div>
          <Button type="submit" disabled={busy} className="w-full h-12 rounded-xl text-[15px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_24px_-8px_hsl(var(--primary)/0.55)]">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Begin"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-muted-foreground hover:text-primary transition-colors pt-2"
          >
            {mode === "signin" ? "New here? Create an account." : "Already have an account? Sign in."}
          </button>
        </form>

        <div className="mt-5">
          <div className="relative flex items-center my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="px-3 text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <button
            type="button"
            onClick={signInWithApple}
            disabled={appleBusy}
            className="w-full h-12 rounded-xl bg-black text-white flex items-center justify-center gap-2 hover:bg-black/90 transition-colors disabled:opacity-60 font-medium"
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
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleBusy}
            className="mt-3 w-full h-12 rounded-xl bg-white text-black border border-border flex items-center justify-center gap-2 hover:bg-secondary transition-colors disabled:opacity-60 font-medium"
          >
            {googleBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.45c-.28 1.46-1.13 2.7-2.4 3.53v2.93h3.88c2.27-2.09 3.56-5.17 3.56-8.7z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-2.93c-1.08.72-2.45 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.27 14.35c-.24-.72-.38-1.49-.38-2.35s.14-1.63.38-2.35V6.54H1.27C.46 8.16 0 9.99 0 12s.46 3.84 1.27 5.46l4-3.11z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.54l4 3.11C6.22 6.86 8.87 4.75 12 4.75z"/>
                </svg>
                <span className="text-sm font-medium">Continue with Google</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
