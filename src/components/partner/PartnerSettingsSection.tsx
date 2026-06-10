import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Copy, Loader2, RefreshCw, Unlink } from "lucide-react";

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

type InviteRow = {
  id: string;
  token: string;
  invitee_email: string;
  status: string;
  expires_at: string;
  created_at: string;
  relationship: string;
};

type ShareRow = {
  id: string;
  connection_id: string;
  share_summary: boolean;
  share_prayer_needs: boolean;
  share_recent_themes: boolean;
  share_testimony: boolean;
  share_mood_pulse: boolean;
};

const REL_OPTIONS = ["spouse", "friend", "mentor", "family", "other"] as const;

type PartnerSettingsSectionProps = { embedded?: boolean };

export function PartnerSettingsSection({ embedded }: PartnerSettingsSectionProps = {}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conns, setConns] = useState<Conn[]>([]);
  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [sentInvites, setSentInvites] = useState<InviteRow[]>([]);
  const [recvInvites, setRecvInvites] = useState<InviteRow[]>([]);
  const [shareRows, setShareRows] = useState<ShareRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRel, setInviteRel] = useState<string>("spouse");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [refreshBusy, setRefreshBusy] = useState(false);

  const peerByConn = useMemo(() => {
    const m = new Map<string, PeerRow>();
    for (const p of peers) m.set(p.connection_id, p);
    return m;
  }, [peers]);

  const shareByConn = useMemo(() => {
    const m = new Map<string, ShareRow>();
    for (const s of shareRows) {
      if (user && s.connection_id) m.set(s.connection_id, s);
    }
    return m;
  }, [shareRows, user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const emailLower = user.email?.trim().toLowerCase() ?? "";
      const [cRes, iRes, rRes, pRes] = await Promise.all([
        supabase
          .from("partner_connections")
          .select("id,user_a,user_b,relationship,created_at,is_active")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("partner_invites")
          .select("id,token,invitee_email,status,expires_at,created_at,relationship")
          .eq("inviter_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        emailLower
          ? supabase
              .from("partner_invites")
              .select("id,token,invitee_email,status,expires_at,created_at,relationship")
              .eq("status", "pending")
              .eq("invitee_email", emailLower)
              .neq("inviter_user_id", user.id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null } as const),
        supabase.rpc("partner_peer_displays"),
      ]);
      if (cRes.error) throw cRes.error;
      if (iRes.error) throw iRes.error;
      if (rRes.error) throw rRes.error;
      if (pRes.error) throw pRes.error;

      setConns((cRes.data ?? []) as Conn[]);
      setSentInvites((iRes.data ?? []) as InviteRow[]);
      setRecvInvites((rRes.data ?? []) as InviteRow[]);
      setPeers((pRes.data ?? []) as PeerRow[]);

      const connList = (cRes.data ?? []) as Conn[];
      if (connList.length === 0) {
        setShareRows([]);
      } else {
        const { data: sData, error: sErr } = await supabase
          .from("partner_share_settings")
          .select(
            "id,connection_id,share_summary,share_prayer_needs,share_recent_themes,share_testimony,share_mood_pulse",
          )
          .eq("owner_user_id", user.id)
          .in(
            "connection_id",
            connList.map((c) => c.id),
          );
        if (sErr) throw sErr;
        setShareRows((sData ?? []) as ShareRow[]);
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn’t load partner data",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Link is on your clipboard." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Select and copy the link manually." });
    }
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast({ variant: "destructive", title: "Check the email", description: "Enter a valid address." });
      return;
    }
    if (email === user.email.trim().toLowerCase()) {
      toast({ variant: "destructive", title: "Almost!", description: "You can’t invite yourself." });
      return;
    }
    setInviteBusy(true);
    const { data, error } = await supabase
      .from("partner_invites")
      .insert({
        inviter_user_id: user.id,
        invitee_email: email,
        relationship: inviteRel,
      })
      .select("id,token")
      .maybeSingle();
    setInviteBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Invite failed", description: error.message });
      return;
    }
    const tok = (data as { token?: string } | null)?.token;
    if (!tok) {
      toast({ variant: "destructive", title: "Invite failed", description: "No token returned." });
      return;
    }
    const link = `${window.location.origin}/partner/accept?token=${encodeURIComponent(tok)}`;
    setLastLink(link);
    setInviteEmail("");
    toast({
      title: "Invite created",
      description: "Copy the link and send it to your partner. Email delivery can be wired later.",
    });
    void load();
  };

  const onDisconnect = async (id: string) => {
    if (!confirm("Disconnect this walking-together link? Both summaries and share settings for this pair will be removed.")) return;
    const { error } = await supabase.from("partner_connections").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t disconnect", description: error.message });
      return;
    }
    toast({ title: "Disconnected" });
    void load();
  };

  const onRevokeInvite = async (id: string) => {
    const { error } = await supabase.from("partner_invites").update({ status: "revoked" }).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t revoke", description: error.message });
      return;
    }
    toast({ title: "Invite revoked" });
    void load();
  };

  const patchShare = async (row: ShareRow, patch: Partial<ShareRow>) => {
    const { error } = await supabase.from("partner_share_settings").update(patch).eq("id", row.id);
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t update sharing", description: error.message });
      void load();
      return;
    }
    setShareRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
  };

  const onRefreshSummary = async () => {
    setRefreshBusy(true);
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; updated?: number; error?: string }>(
      "partner-refresh-summary",
      { body: {} },
    );
    setRefreshBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Refresh failed", description: error.message });
      return;
    }
    if (data && typeof data === "object" && "error" in data && data.error) {
      toast({ variant: "destructive", title: "Refresh failed", description: String(data.error) });
      return;
    }
    const n = data && typeof data === "object" && "updated" in data ? Number((data as { updated?: number }).updated) : 0;
    toast({ title: "Summary refreshed", description: n ? `Updated ${n} connection(s).` : "No active connections to update." });
  };

  if (!user) return null;

  if (loading) {
    return (
      <section className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading partner settings…
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {!embedded ? (
        <div>
          <h2 className="font-display text-lg text-leather mb-1">Partner connection</h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-prose">
            Walk together with a privacy-safe snapshot — never raw journals, vents, or private notes. You each control what
            you share.
          </p>
        </div>
      ) : null}

      {conns.length > 0 && (
        <div className="space-y-4">
          {conns.map((c) => {
            const peer = peerByConn.get(c.id);
            const name =
              peer?.peer_display_name?.trim() ||
              peer?.peer_email?.split("@")[0] ||
              "Partner";
            const share = shareByConn.get(c.id);
            return (
              <Card key={c.id} className="border-paper-edge bg-paper/70">
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-base text-leather">Walking with {name}</CardTitle>
                    <CardDescription className="capitalize">{c.relationship.replace(/_/g, " ")}</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => void onDisconnect(c.id)}>
                    <Unlink className="w-3.5 h-3.5" /> Disconnect
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {share ? (
                    <div className="rounded-md border border-paper-edge bg-background/40 p-3 space-y-3">
                      <div className="text-xs font-medium text-leather">What I share with them</div>
                      {(
                        [
                          ["share_summary", "Summary of where I am", share.share_summary],
                          ["share_recent_themes", "Recent themes / feelings", share.share_recent_themes],
                          ["share_prayer_needs", "Prayer points", share.share_prayer_needs],
                          ["share_testimony", "Testimony (broad strokes)", share.share_testimony],
                          ["share_mood_pulse", "Mood pulse (aggregate)", share.share_mood_pulse],
                        ] as const
                      ).map(([key, label, on]) => (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <Label htmlFor={`${c.id}-${key}`} className="text-sm font-normal cursor-pointer">
                            {label}
                          </Label>
                          <Switch
                            id={`${c.id}-${key}`}
                            checked={on}
                            onCheckedChange={(v) => void patchShare(share, { [key]: v } as Partial<ShareRow>)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Share settings are still syncing — pull to refresh the page.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-paper-edge bg-paper/70">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base text-leather">Invite a partner</CardTitle>
          <CardDescription className="text-xs">
            We’ll create a private link.{" "}
            {/* Email delivery can be wired to Supabase Auth / Resend later. */}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onInvite(e)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="partner-email">Their email</Label>
              <Input
                id="partner-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partner-rel">Relationship</Label>
              <select
                id="partner-rel"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={inviteRel}
                onChange={(e) => setInviteRel(e.target.value)}
              >
                {REL_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={inviteBusy} className="w-full sm:w-auto">
              {inviteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create invite"}
            </Button>
          </form>
          {lastLink && (
            <div className="mt-4 rounded-md border border-paper-edge bg-muted/30 p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Shareable link</div>
              <div className="text-xs break-all font-mono text-foreground/90">{lastLink}</div>
              <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => void copyText(lastLink)}>
                <Copy className="w-3.5 h-3.5" /> Copy link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {sentInvites.length > 0 && (
        <Card className="border-paper-edge bg-paper/60">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base text-leather">Pending invites I sent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {sentInvites.map((inv) => {
              const link = `${window.location.origin}/partner/accept?token=${encodeURIComponent(inv.token)}`;
              const expired = new Date(inv.expires_at).getTime() < Date.now();
              return (
                <div key={inv.id} className="rounded-md border border-paper-edge p-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-foreground/90">{inv.invitee_email}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void onRevokeInvite(inv.id)}>
                      Revoke
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">{inv.relationship}</div>
                  {expired && <div className="text-xs text-amber-700">Expired — send a new invite.</div>}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => void copyText(link)}>
                      <Copy className="w-3.5 h-3.5" /> Copy link
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {recvInvites.length > 0 && (
        <Card className="border-paper-edge bg-paper/60">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base text-leather">Invites for you</CardTitle>
            <CardDescription className="text-xs">Open the link while signed in as {user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recvInvites.map((inv) => {
              const expired = new Date(inv.expires_at).getTime() < Date.now();
              return (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-paper-edge p-3">
                  <div className="text-sm">
                    <div className="font-medium text-leather capitalize">{inv.relationship}</div>
                    <div className="text-xs text-muted-foreground">
                      {expired ? "Expired" : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  {!expired ? (
                    <Button asChild size="sm">
                      <Link to={`/partner/accept?token=${encodeURIComponent(inv.token)}`}>Accept</Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Ask for a new invite.</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Button type="button" variant="secondary" className="gap-2" disabled={refreshBusy} onClick={() => void onRefreshSummary()}>
          {refreshBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh my summary
        </Button>
        <Button asChild variant="outline">
          <Link to="/partner">Open walking together</Link>
        </Button>
      </div>
    </section>
  );
}
