import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, HeartHandshake, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Conn = {
  id: string;
  user_a: string;
  user_b: string;
  relationship: string;
  created_at: string;
};

type PeerRow = {
  connection_id: string;
  peer_user_id: string;
  peer_display_name: string | null;
  peer_email: string | null;
};

type SummaryRow = {
  summary: string;
  recent_themes: string[] | null;
  prayer_points: string[] | null;
  season_label: string | null;
  mood_pulse: unknown;
  generated_at: string | null;
};

function partnerId(c: Conn, me: string): string {
  return c.user_a === me ? c.user_b : c.user_a;
}

export default function PartnerWalkPage() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [conns, setConns] = useState<Conn[]>([]);
  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [summaries, setSummaries] = useState<Record<string, SummaryRow>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const { data: cRows, error: cErr } = await supabase
      .from("partner_connections")
      .select("id,user_a,user_b,relationship,created_at,is_active")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (cErr) throw cErr;
    const list = (cRows ?? []) as Conn[];
    setConns(list);

    const { data: peerRows, error: pErr } = await supabase.rpc("partner_peer_displays");
    if (pErr) throw pErr;
    setPeers((peerRows ?? []) as PeerRow[]);

    const nextSumm: Record<string, SummaryRow> = {};
    for (const c of list) {
      const pid = partnerId(c, user.id);
      const { data: s, error: sErr } = await supabase
        .from("partner_summaries")
        .select("summary,recent_themes,prayer_points,season_label,mood_pulse,generated_at")
        .eq("connection_id", c.id)
        .eq("owner_user_id", pid)
        .maybeSingle();
      if (sErr) throw sErr;
      if (s) nextSumm[c.id] = s as SummaryRow;
    }
    setSummaries(nextSumm);
    setReady(true);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load().catch((err) => {
      toast({
        variant: "destructive",
        title: "Couldn’t load walking together",
        description: err instanceof Error ? err.message : String(err),
      });
      setReady(true);
    });
  }, [user, load]);

  const peerByConn = useMemo(() => {
    const m = new Map<string, PeerRow>();
    for (const p of peers) m.set(p.connection_id, p);
    return m;
  }, [peers]);

  if (!loading && !user) {
    return <Navigate to={`/auth?next=${encodeURIComponent("/partner")}`} replace />;
  }

  if (loading || !ready) {
    return (
      <div className="min-h-screen app-mesh flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (conns.length === 0) {
    return (
      <div className="min-h-screen app-mesh pb-safe-16">
        <div className="max-w-lg mx-auto px-5 pt-10 space-y-6">
          <div className="text-center space-y-2">
            <HeartHandshake className="w-10 h-10 mx-auto text-rose-400" />
            <h1 className="font-display text-2xl text-leather">Walking together</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you connect with someone you trust, you’ll see a gentle, privacy-safe snapshot here — never raw
              journals or vents — so you can pray and check in with warmth.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/settings">Invite or connect in Settings</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-mesh pb-safe-20">
      <div className="max-w-lg mx-auto px-5 pt-8 space-y-6">
        {conns.map((c) => {
          const peer = peerByConn.get(c.id);
          const sum = summaries[c.id];
          const name =
            peer?.peer_display_name?.trim() ||
            peer?.peer_email?.split("@")[0] ||
            "your partner";
          const themes = sum?.recent_themes ?? [];
          const prayers = sum?.prayer_points ?? [];
          const questions = themes.length > 0
            ? themes.slice(0, 3).map((t) => `How is ${t} showing up for you this week?`)
            : [`What's God been stirring in you lately?`, `Where do you need encouragement?`, `What can I be praying about?`];
          const prayerPrompt =
            prayers.length > 0
              ? `Praying for ${name}: ${prayers.join(" · ")}`
              : `Praying for ${name} — holding them before God with gratitude and gentleness.`;

          return (
            <div key={c.id} className="space-y-5">
              <Card className="border-paper-edge bg-paper/75 shadow-soft overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                      <HeartHandshake className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="font-display text-xl text-leather leading-snug">
                        Walking with {name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 capitalize">
                        {c.relationship.replace(/_/g, " ")} · since{" "}
                        {new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {!sum?.summary?.trim() ? (
                <Card className="border-dashed border-paper-edge bg-paper/50">
                  <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed">
                    <p className="mb-3">
                      {name} hasn’t refreshed their walking snapshot yet — or they’ve turned off sharing for some
                      sections.
                    </p>
                    <p className="text-xs">You can nudge them (kindly) to tap “Refresh my summary” in Settings.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-paper-edge bg-paper/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg text-leather flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Where they are
                    </CardTitle>
                    {sum.generated_at && (
                      <CardDescription className="text-[11px]">
                        Snapshot updated {new Date(sum.generated_at).toLocaleString()}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
                    {sum.season_label?.trim() && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground w-full">Season</span>
                        <span className="inline-flex items-center rounded-full bg-violet-100/80 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100 px-3 py-1 text-xs font-medium">
                          {sum.season_label}
                        </span>
                      </div>
                    )}
                    <p>{sum.summary}</p>
                    {themes.length > 0 && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Recent themes</div>
                        <div className="flex flex-wrap gap-2">
                          {themes.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-muted/80 px-3 py-1 text-xs text-foreground/90"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {prayers.length > 0 ? (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Prayer points they shared</div>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm">
                          {prayers.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Prayer points aren’t shared right now — you can still carry them quietly before God.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="flex-1">
                  <Link to={`/journal/new?prompt=${encodeURIComponent(prayerPrompt)}`}>Pray for them</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/settings">How I’m sharing</Link>
                </Button>
              </div>

              <Card className="border-paper-edge bg-paper/60">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base text-leather">Check-in questions</CardTitle>
                  <CardDescription className="text-xs">Gentle openers — pick one when you have margin to listen.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-foreground/90">
                  {questions.map((q) => (
                    <p key={q} className="pl-3 border-l-2 border-rose-200/80 dark:border-rose-800/80 leading-snug">
                      {q}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
