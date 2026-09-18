import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { parseIdentitySummaryPayload, type IdentitySummaryPayload } from "@/lib/framework/identitySummary";
import { queryClient } from "@/lib/queryClient";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { useAiWritingAssistStore } from "@/lib/aiWritingAssistStore";

export type { IdentitySummaryPayload };

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  /** ISO `YYYY-MM-DD` from Postgres `date` */
  date_of_birth?: string | null;
  cover: string;
  highlight_palette: string;
  font_choice: string;
  page_tone: string;
  layout: string;
  onboarded: boolean;
  identity_summary: IdentitySummaryPayload | null;
  identity_generated_at: string | null;
  all_entries_cover_kind?: "none" | "photo";
  all_entries_cover_value?: string | null;
  all_entries_cover_focal_x?: number;
  all_entries_cover_focal_y?: number;
}

export type SignUpResult = {
  error: Error | null;
  /** False when Supabase requires email confirmation before a session exists. */
  sessionCreated: boolean;
  profile: Profile | null;
};

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; profile: Profile | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<Profile | null>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: Error | null; profile: Profile | null }>;
}

export type AuthContextValue = AuthCtx;

export const AuthContext = createContext<AuthCtx | undefined>(undefined);

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
  const locking = useJournalVaultStore((s) => s.locking);
  const lockEpoch = useJournalVaultStore((s) => s.lockEpoch);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  useEffect(() => { queryClient.clear(); }, [lockEpoch]);

  const loadProfile = useCallback(async (uid: string, isCurrent: () => boolean = () => true): Promise<Profile | null> => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    const next = data ? profileFromDbRow(data) : null;
    if (isCurrent()) setProfile(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let receivedAuthEvent = false;
    let activeUserId: string | null | undefined;
    let generation = 0;
    let profileTimer: ReturnType<typeof setTimeout> | undefined;

    const applySession = (sess: Session | null) => {
      if (cancelled) return;
      const nextUserId = sess?.user.id ?? null;
      const previousUserId = activeUserId;
      const identityChanged = activeUserId !== nextUserId;
      activeUserId = nextUserId;
      // Capture pending editor state before the account change unmounts its view.
      const privacyTransition = identityChanged && previousUserId
        ? useJournalVaultStore.getState().reset() : Promise.resolve();
      void privacyTransition.catch((error) => setPrivacyError(error instanceof Error ? error.message : "Journal draft protection failed"));
      setSession(sess);
      setUser(sess?.user ?? null);
      // TOKEN_REFRESHED and repeated SIGNED_IN events are background updates,
      // not navigation. Setting loading=true here unmounted the journal/map.
      if (!identityChanged) return;

      const currentGeneration = ++generation;
      clearTimeout(profileTimer);
      setProfile(null);
      if (!nextUserId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const isCurrent = () => !cancelled && generation === currentGeneration;
      // Leave the auth callback before making another Supabase request.
      profileTimer = setTimeout(() => {
        const prepare = privacyTransition;
        void prepare.catch((error: unknown) => {
          if (isCurrent()) setPrivacyError(error instanceof Error ? error.message : "Previous journal drafts could not be protected.");
          throw error;
        }).then(() => isCurrent() ? loadProfile(nextUserId, isCurrent) : null).catch((error: unknown) => {
          if (isCurrent()) console.error("Could not load account profile", error);
        }).finally(() => {
          if (isCurrent()) setLoading(false);
        });
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      receivedAuthEvent = true;
      applySession(sess);
    });

    void (async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        // A newer auth event wins over a delayed bootstrap response.
        if (!cancelled && !receivedAuthEvent) applySession(s);
      } catch (error) {
        if (!cancelled && !receivedAuthEvent) {
          console.error("Could not restore account session", error);
          applySession(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(profileTimer);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!user) {
      useAiWritingAssistStore.getState().initForUser(null);
      return;
    }
    useAiWritingAssistStore.getState().initForUser(user.id, {
      email: user.email,
      displayName: profile?.display_name,
    });
  }, [user?.id, user?.email, profile?.display_name]);

  const value = useMemo<AuthCtx>(() => ({
    user, session, profile, loading,
    signUp: async (email, password, displayName) => {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: displayName ? { display_name: displayName } : undefined,
        },
      });
      if (error) return { error: new Error(error.message), sessionCreated: false, profile: null };
      const created = Boolean(data.session);
      const loaded = data.session?.user ? await loadProfile(data.session.user.id) : null;
      return { error: null, sessionCreated: created, profile: loaded };
    },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message), profile: null };
      const { data: { session: s } } = await supabase.auth.getSession();
      const loaded = s?.user ? await loadProfile(s.user.id) : null;
      return { error: null, profile: loaded };
    },
    signOut: async () => {
      await useJournalVaultStore.getState().reset();
      await supabase.auth.signOut();
    },
    requestPasswordReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      return { error: error ? new Error(error.message) : null };
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error ? new Error(error.message) : null };
    },
    deleteAccount: async () => {
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>("delete-account", {
        method: "POST",
        body: {},
      });
      if (error) return { error: new Error(error.message) };
      if (data?.error) return { error: new Error(data.error) };
      return { error: null };
    },
    refreshProfile: async () => (user ? loadProfile(user.id) : null),
    updateProfile: async (patch) => {
      if (!user) return { error: new Error("Not signed in"), profile: null };
      const { data, error } = await supabase
        .from("profiles")
        .update(patch as never)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();
      if (error) return { error: new Error(error.message), profile: null };

      let row = data;
      if (!row) {
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, ...patch } as never)
          .select()
          .maybeSingle();
        if (insertError) return { error: new Error(insertError.message), profile: null };
        row = inserted;
      }

      const next = row ? profileFromDbRow(row) : null;
      setProfile(next);
      return { error: null, profile: next };
    },
  }), [user, session, profile, loading, loadProfile]);

  return <AuthContext.Provider value={value}>
    {privacyError ? <div role="alert" className="p-6 space-y-3"><p>{privacyError}</p>
      <p>Previous journal drafts are retained. Finish protecting them before opening this account.</p>
      <button type="button" onClick={async () => {
        try { await useJournalVaultStore.getState().reset(); setPrivacyError(null); if (user) await loadProfile(user.id); }
        catch (error) { setPrivacyError(error instanceof Error ? error.message : "Please retry."); }
      }}>Retry protecting drafts</button>
    </div> : locking ? <div role="status">Protecting journal drafts…</div> : <Fragment key={`${user?.id ?? "signed-out"}:${lockEpoch}`}>{children}</Fragment>}
  </AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
