import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { parseIdentitySummaryPayload, type IdentitySummaryPayload } from "@/lib/framework/identitySummary";

export type { IdentitySummaryPayload };

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  cover: string;
  highlight_palette: string;
  font_choice: string;
  page_tone: string;
  layout: string;
  onboarded: boolean;
  identity_summary: IdentitySummaryPayload | null;
  identity_generated_at: string | null;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function profileFromDbRow(data: unknown): Profile | null {
  if (!isRecord(data)) return null;
  const base = data as unknown as Profile;
  return {
    ...base,
    identity_summary: parseIdentitySummaryPayload(data.identity_summary),
    identity_generated_at:
      typeof data.identity_generated_at === "string" ? data.identity_generated_at : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    setProfile(data ? profileFromDbRow(data) : null);
  };

  useEffect(() => {
    // Listener FIRST, then session check
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer to avoid deadlock with Supabase client
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, session, profile, loading,
    signUp: async (email, password, displayName) => {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: displayName ? { display_name: displayName } : undefined,
        },
      });
      return { error: error ? new Error(error.message) : null };
    },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    },
    signOut: async () => { await supabase.auth.signOut(); },
    refreshProfile: async () => { if (user) await loadProfile(user.id); },
    updateProfile: async (patch) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").update(patch as never).eq("user_id", user.id).select().maybeSingle();
      if (data) setProfile(profileFromDbRow(data));
    },
  }), [user, session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
