import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseIdentitySummaryPayload } from "@/lib/framework/identitySummary";
import {
  HOME_PROFILE_PHOTO_STORAGE_KEY,
  homeProfilePhotoFromLayout,
  homeProfilePhotoRefFromLayout,
  readHomeProfilePhotoFromStorage,
} from "@/lib/homeProfilePhoto";
import { resolveHomeMediaUrl } from "@/lib/profile/homeMedia";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function monogramGradient(name: string): string {
  const h = hashString(name.toLowerCase());
  const h1 = h % 360;
  const h2 = (h1 + 48) % 360;
  return `linear-gradient(135deg, hsl(${h1} 42% 38%), hsl(${h2} 46% 28%))`;
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type InvokeIdentityResponse = {
  identity_summary?: unknown;
  identity_generated_at?: string;
  error?: string;
};

export default function IdentityCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [countsBusy, setCountsBusy] = useState(true);
  const [beliefCount, setBeliefCount] = useState(0);
  const [influenceCount, setInfluenceCount] = useState(0);

  const displayName = profile?.display_name?.trim() || "";
  const titleText = displayName ? `Who is ${displayName}?` : "Who are you?";

  const identity = profile?.identity_summary ?? null;
  const generatedAt = profile?.identity_generated_at ?? null;

  const [storagePhotoTick, setStoragePhotoTick] = useState(0);
  const [signedAvatarUrl, setSignedAvatarUrl] = useState<string | undefined>();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === HOME_PROFILE_PHOTO_STORAGE_KEY) setStoragePhotoTick((t) => t + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const inline = homeProfilePhotoFromLayout(profile?.layout);
    if (inline) {
      setSignedAvatarUrl(inline);
      return;
    }
    const ref = homeProfilePhotoRefFromLayout(profile?.layout);
    if (!ref) {
      setSignedAvatarUrl(undefined);
      return;
    }
    let cancelled = false;
    void resolveHomeMediaUrl(ref).then((url) => {
      if (!cancelled) setSignedAvatarUrl(url ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.layout, storagePhotoTick]);

  const avatarUrl = useMemo(() => {
    if (signedAvatarUrl) return signedAvatarUrl;
    const fromLs = readHomeProfilePhotoFromStorage();
    if (fromLs) return fromLs;
    const m = user?.user_metadata;
    if (!m || typeof m !== "object" || Array.isArray(m)) return undefined;
    const rec = m as Record<string, unknown>;
    const a = rec.avatar_url;
    const p = rec.picture;
    if (typeof a === "string" && a.trim()) return a.trim();
    if (typeof p === "string" && p.trim()) return p.trim();
    return undefined;
  }, [signedAvatarUrl, user?.user_metadata, storagePhotoTick]);

  const monogramName = displayName || user?.email || "You";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setCountsBusy(true);
      const [{ count: bc }, srcRes] = await Promise.all([
        supabase.from("belief_nodes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("belief_sources").select("source_type,label").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setBeliefCount(bc ?? 0);
      const rows = (srcRes.data ?? []) as Array<{ source_type: string; label: string }>;
      const keys = new Set(
        rows.map((r) => `${r.source_type.toLowerCase()}::${r.label.trim().toLowerCase()}`),
      );
      setInfluenceCount(keys.size);
      setCountsBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const runGenerate = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke<InvokeIdentityResponse>(
        "framework-generate-identity",
        { body: {} },
      );
      if (error) {
        toast({
          title: "Could not synthesize identity",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      if (!data || !isRecord(data)) {
        toast({
          title: "Could not synthesize identity",
          description: "Unexpected response from server.",
          variant: "destructive",
        });
        return;
      }
      if (typeof data.error === "string" && data.error) {
        toast({
          title: "Could not synthesize identity",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      const parsedOk = parseIdentitySummaryPayload(data.identity_summary);
      if (!parsedOk || typeof data.identity_generated_at !== "string") {
        toast({
          title: "Could not synthesize identity",
          description: "The model returned an unexpected shape.",
          variant: "destructive",
        });
        return;
      }
      await refreshProfile();
      toast({ title: identity ? "Identity refreshed" : "Identity draft ready" });
    } finally {
      setBusy(false);
    }
  }, [identity, refreshProfile]);

  if (!user || !profile) {
    return (
      <Card className="mt-5 sm:mt-6 rounded-3xl border-border/60 p-6 shadow-sm">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-8 w-2/3 max-w-md mb-6" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  const summaryBlocks = identity
    ? identity.summary
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const relativeGenerated =
    generatedAt && !busy
      ? formatDistanceToNow(new Date(generatedAt), { addSuffix: true })
      : null;

  return (
    <Card
      className={cn(
        "mt-5 sm:mt-6 overflow-hidden rounded-3xl border border-border/60 shadow-md animate-fade-up",
        "ring-1 ring-black/[0.03] dark:ring-white/[0.05]",
      )}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 90% 70% at 100% 0%, hsl(var(--primary) / 0.08) 0%, transparent 55%)," +
          "radial-gradient(ellipse 80% 60% at 0% 100%, hsl(38 72% 72% / 0.22) 0%, transparent 60%)," +
          "linear-gradient(180deg, hsl(40 38% 98%) 0%, hsl(0 0% 100%) 72%)",
        animationDelay: "40ms",
        animationFillMode: "backwards",
      }}
    >
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <Avatar className="h-16 w-16 shrink-0 rounded-2xl ring-2 ring-white/80 shadow-md sm:h-[76px] sm:w-[76px] sm:rounded-[1.35rem]">
            {avatarUrl ? (
              <AvatarImage
                src={avatarUrl}
                alt=""
                className="object-cover object-top"
              />
            ) : null}
            <AvatarFallback
              className="rounded-2xl text-lg font-semibold text-white sm:rounded-[1.35rem]"
              style={{ background: monogramGradient(monogramName) }}
            >
              {initialsFromName(monogramName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/85">
                Who you are
              </div>
              <h2 className="mt-1.5 font-display text-2xl sm:text-[1.75rem] leading-tight tracking-tight text-foreground text-balance">
                {titleText}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {countsBusy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin opacity-60" aria-hidden />
                    Tallying your framework…
                  </span>
                ) : (
                  <>
                    Based on{" "}
                    <span className="tabular-nums font-medium text-foreground/90">{beliefCount}</span>{" "}
                    belief{beliefCount === 1 ? "" : "s"} ·{" "}
                    <span className="tabular-nums font-medium text-foreground/90">{influenceCount}</span>{" "}
                    influence{influenceCount === 1 ? "" : "s"}
                  </>
                )}
              </p>
            </div>

            {busy ? (
              <div className="space-y-3 rounded-2xl border border-border/50 bg-background/50 p-4">
                <div className="text-sm font-medium text-foreground/90">Synthesizing…</div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[92%]" />
                <Skeleton className="h-3 w-[88%]" />
              </div>
            ) : null}

            {!busy && !identity ? (
              <p className="text-[15px] leading-relaxed text-muted-foreground max-w-prose">
                Add a few beliefs and run this to get a draft summary you can use anywhere.
              </p>
            ) : null}

            {!busy && identity ? (
              <div className="space-y-4">
                <div className="space-y-3 text-[15px] leading-relaxed text-foreground/95 max-w-prose">
                  {summaryBlocks.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {identity.markers.map((m, i) => (
                    <Badge
                      key={`${m}-${i}`}
                      variant="secondary"
                      className="rounded-full px-3 py-1 text-xs font-normal text-foreground/90 bg-background/80 border border-border/60"
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
                <blockquote className="border-l-2 border-primary/35 pl-4 text-sm italic text-muted-foreground leading-relaxed">
                  {identity.voice}
                </blockquote>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {identity.tags.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                {relativeGenerated ? <>Generated {relativeGenerated}</> : busy ? null : "\u00a0"}
              </div>
              <div className="flex flex-wrap gap-2">
                {!identity ? (
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={busy}
                    onClick={() => void runGenerate()}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Synthesizing…
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl gap-2"
                    disabled={busy}
                    onClick={() => void runGenerate()}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-4 w-4" aria-hidden />
                    )}
                    Regenerate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}