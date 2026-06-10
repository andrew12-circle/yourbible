import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  disconnectYouTube,
  fetchYouTubeConnectionStatus,
  startYouTubeOAuth,
  type YouTubeConnectionStatus,
} from "@/lib/youtube/youtubeOAuthClient";

type Props = { embedded?: boolean };

export function YouTubeConnectionSection({ embedded }: Props = {}) {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<YouTubeConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await fetchYouTubeConnectionStatus());
    } catch (e) {
      setStatus({ configured: false, connected: false });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const flag = params.get("youtube");
    if (!flag) return;
    if (flag === "connected") {
      const channel = params.get("channel");
      toast({
        title: "YouTube connected",
        description: channel ? `Signed in as ${channel}. Your uploads can pull captions via the official API.` : undefined,
      });
      void load();
    } else if (flag === "error") {
      const reason = params.get("reason") ?? "unknown";
      toast({
        title: "Could not connect YouTube",
        description: reason,
        variant: "destructive",
      });
    }
    params.delete("youtube");
    params.delete("channel");
    params.delete("reason");
    setParams(params, { replace: true });
  }, [params, setParams, load]);

  const onConnect = async () => {
    setBusy(true);
    try {
      const authUrl = await startYouTubeOAuth("/settings?section=integrations");
      window.location.href = authUrl;
    } catch (e) {
      setBusy(false);
      toast({
        title: "Could not start YouTube sign-in",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const onDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectYouTube();
      await load();
      toast({ title: "YouTube disconnected" });
    } catch (e) {
      toast({
        title: "Could not disconnect",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      {!embedded ? (
        <h2 className="font-display text-lg text-leather mb-3">YouTube transcripts</h2>
      ) : (
        <h3 className="text-sm font-semibold mb-3">YouTube transcripts</h3>
      )}
      <div className={embedded ? "rounded-xl border bg-card p-4 space-y-3 shadow-sm" : "rounded-lg border border-paper-edge bg-paper/70 p-4 space-y-3"}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0">
            <Youtube className="w-5 h-5 text-red-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Connect your YouTube channel</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Pulls official captions for videos you own (including private/unlisted uploads). Public videos still use
              the fast caption race and AssemblyAI fallback.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            Checking connection…
          </div>
        ) : status?.connected ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-leather">
              Connected{status.channelTitle ? ` as ${status.channelTitle}` : ""}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void onDisconnect()}>
              Disconnect
            </Button>
          </div>
        ) : status?.configured ? (
          <Button type="button" disabled={busy} onClick={() => void onConnect()}>
            {busy ? "Redirecting…" : "Connect YouTube"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            YouTube OAuth is not configured on the server yet (GOOGLE_OAUTH_CLIENT_ID / SECRET).
          </p>
        )}
      </div>
    </section>
  );
}
