import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME } from "@/lib/appBrand";

export default function AuthResetPage() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setChecking(false);
      }
    });

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setRecoveryReady(true);
      }
      setChecking(false);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!checking && !recoveryReady && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!checking && user && !recoveryReady) {
    return <Navigate to="/home" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Use at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Try again." });
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't update password", description: error.message });
      return;
    }
    toast({ title: "Password updated", description: "You're signed in." });
    navigate("/home", { replace: true });
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 pb-[max(1.5rem,var(--safe-area-inset-bottom))] pt-[max(1.5rem,var(--safe-area-inset-top))] app-mesh">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Choose a new password</h1>
          <p className="text-muted-foreground text-sm">For your {APP_NAME} account</p>
        </div>

        {checking ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4 bg-white/85 backdrop-blur-xl p-7 rounded-3xl border border-white/70 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.18)]"
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="h-11 rounded-xl bg-secondary border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="h-11 rounded-xl bg-secondary border-transparent"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-12 rounded-xl text-[15px] font-semibold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
            </Button>
            <p className="text-center text-xs text-muted-foreground pt-1">
              <Link to="/auth" className="hover:text-primary transition-colors">Back to sign in</Link>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
