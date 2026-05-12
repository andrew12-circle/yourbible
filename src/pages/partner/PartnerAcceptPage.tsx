import { useEffect, useMemo, useRef } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

function mapRpcError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invite_expired")) return "This invite has expired. Ask your partner to send a new one.";
  if (m.includes("wrong_invitee")) return "This invite was sent to a different email address than the one you’re signed in with.";
  if (m.includes("self_invite")) return "You can’t accept your own invite.";
  if (m.includes("already_accepted")) return "This invite was already accepted.";
  if (m.includes("already_connected")) return "You’re already connected with this person.";
  if (m.includes("invalid_token")) return "This link isn’t valid.";
  if (m.includes("invite_not_pending")) return "This invite is no longer active.";
  if (m.includes("not_authenticated")) return "Please sign in to continue.";
  return msg;
}

export default function PartnerAcceptPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const token = useMemo(() => (params.get("token") ?? "").trim(), [params]);

  const nextParam = useMemo(() => {
    const path = `/partner/accept?token=${encodeURIComponent(token)}`;
    return `/auth?next=${encodeURIComponent(path)}`;
  }, [token]);

  useEffect(() => {
    ranRef.current = false;
  }, [token]);

  useEffect(() => {
    if (loading || !user || !token) return;
    const guardKey = `yb_partner_accept:${token}:${user.id}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(guardKey) === "ok") {
      navigate("/partner", { replace: true });
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("accept_partner_invite", { p_token: token });
      if (cancelled) return;
      if (error) {
        ranRef.current = false;
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(guardKey);
        toast({
          variant: "destructive",
          title: "Couldn’t accept invite",
          description: mapRpcError(error.message),
        });
        return;
      }
      if (typeof data === "string" && data) {
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem(guardKey, "ok");
        toast({ title: "You’re connected", description: "Walking together is ready when you are." });
        navigate("/partner", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, token, navigate]);

  if (!token) {
    return (
      <div className="min-h-screen app-mesh flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-paper-edge bg-paper/80">
          <CardHeader>
            <CardTitle className="font-display text-leather">Missing invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>This page needs a valid invite link.</p>
            <Button asChild variant="outline">
              <Link to="/settings">Open settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to={nextParam} replace />;
  }

  return (
    <div className="min-h-screen app-mesh flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-paper-edge bg-paper/80">
        <CardHeader>
          <CardTitle className="font-display text-leather">Connecting you</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          Finishing the invite…
        </CardContent>
      </Card>
    </div>
  );
}
