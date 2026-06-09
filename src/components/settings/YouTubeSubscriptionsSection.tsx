import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Loader2, Plus, Trash2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  listYouTubeSubscriptions,
  subscribeYouTubeChannel,
  syncYouTubeSubscriptions,
  unsubscribeYouTubeChannel,
  type YouTubeChannelSubscription,
} from "@/lib/youtube/youtubeSubscriptions";

export function YouTubeSubscriptionsSection() {
  const [subs, setSubs] = useState<YouTubeChannelSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelInput, setChannelInput] = useState("");
  const [importRecent, setImportRecent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubs(await listYouTubeSubscriptions());
    } catch (e) {
      console.error(e);
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubscribe = async () => {
    const input = channelInput.trim();
    if (!input) {
      toast({ title: "Paste a channel URL or @handle", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { imported } = await subscribeYouTubeChannel(input, importRecent ? 3 : 0);
      setChannelInput("");
      await load();
      toast({
        title: "Channel subscribed",
        description: imported
          ? `Imported ${imported} recent video${imported === 1 ? "" : "s"} into your library.`
          : "New uploads will appear in your artifact library automatically.",
      });
    } catch (e) {
      toast({
        title: "Could not subscribe",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const onUnsubscribe = async (sub: YouTubeChannelSubscription) => {
    const label = sub.channel_title ?? sub.channel_handle ?? "this channel";
    if (!window.confirm(`Unsubscribe from ${label}? Existing artifacts stay in your library.`)) return;
    setBusy(true);
    try {
      await unsubscribeYouTubeChannel(sub.id);
      await load();
      toast({ title: "Unsubscribed" });
    } catch (e) {
      toast({
        title: "Could not unsubscribe",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const onSyncNow = async () => {
    setSyncing(true);
    try {
      const imported = await syncYouTubeSubscriptions(true);
      if (imported > 0) {
        toast({
          title: `${imported} new video${imported === 1 ? "" : "s"} imported`,
          description: "Check your artifact library for unwatched items.",
        });
      } else {
        toast({ title: "Already up to date", description: "No new uploads from your subscriptions." });
      }
    } catch (e) {
      toast({
        title: "Sync failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section>
      <h2 className="font-display text-lg text-leather mb-3">YouTube subscriptions</h2>
      <div className="rounded-lg border border-paper-edge bg-paper/70 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-red-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-leather font-medium">Follow channels in your library</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Subscribe to a YouTube channel and new uploads are pulled into your artifact library as they go live.
              They show up in the <strong>Unwatched</strong> shelf until you open them.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            placeholder="youtube.com/@channel or channel URL"
            className="flex-1"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSubscribe();
            }}
          />
          <Button type="button" disabled={busy} onClick={() => void onSubscribe()} className="shrink-0">
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                Subscribing…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" aria-hidden />
                Subscribe
              </>
            )}
          </Button>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={importRecent}
            onChange={(e) => setImportRecent(e.target.checked)}
            disabled={busy}
            className="rounded border-border"
          />
          Also import the 3 most recent videos now
        </label>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            Loading subscriptions…
          </div>
        ) : subs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No channel subscriptions yet.</p>
        ) : (
          <ul className="space-y-2">
            {subs.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2"
              >
                {sub.channel_thumbnail_url ? (
                  <img
                    src={sub.channel_thumbnail_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-red-600/10 flex items-center justify-center shrink-0">
                    <Youtube className="w-4 h-4 text-red-600" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{sub.channel_title ?? "YouTube channel"}</p>
                  {sub.channel_handle ? (
                    <p className="text-xs text-muted-foreground truncate">@{sub.channel_handle}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => void onUnsubscribe(sub)}
                  aria-label={`Unsubscribe from ${sub.channel_title ?? "channel"}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" disabled={syncing || subs.length === 0} onClick={() => void onSyncNow()}>
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                Checking…
              </>
            ) : (
              "Check for new videos"
            )}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/framework/artifacts">Open artifact library</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
