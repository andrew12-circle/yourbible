import { useCallback, useEffect, useState } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  disconnectGoogleDrive,
  fetchGoogleDriveConnectionStatus,
  startGoogleDriveOAuth,
  syncGoogleDriveBackup,
  type GoogleDriveConnectionStatus,
} from "@/lib/googleDrive/googleDriveClient";

type Props = {
  embedded?: boolean;
  onSyncComplete?: () => void;
};

export function GoogleDriveBackupSection({ embedded, onSyncComplete }: Props) {
  const [status, setStatus] = useState<GoogleDriveConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await fetchGoogleDriveConnectionStatus());
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

  const onConnect = async () => {
    setBusy(true);
    try {
      const authUrl = await startGoogleDriveOAuth("/settings?section=storage");
      window.location.href = authUrl;
    } catch (e) {
      setBusy(false);
      toast({
        title: "Could not start Google sign-in",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const onDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectGoogleDrive();
      await load();
      toast({ title: "Google Drive disconnected" });
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

  const runSyncLoop = async () => {
    setBusy(true);
    setSyncProgress("Starting backup…");
    let totalUploaded = 0;
    try {
      for (let i = 0; i < 200; i += 1) {
        const result = await syncGoogleDriveBackup();
        totalUploaded += result.uploaded;
        if (result.error) {
          throw new Error(result.error);
        }
        if (result.complete || result.remaining <= 0) {
          setSyncProgress(null);
          toast({
            title: "Google Drive backup complete",
            description: `${totalUploaded} file${totalUploaded === 1 ? "" : "s"} synced to YourBible Vault.`,
          });
          await load();
          onSyncComplete?.();
          return;
        }
        setSyncProgress(`${totalUploaded} synced — ${result.remaining} remaining…`);
      }
      toast({
        title: "Backup in progress",
        description: `${totalUploaded} files synced so far. Tap Sync again to continue.`,
      });
      await load();
      onSyncComplete?.();
    } catch (e) {
      setSyncProgress(null);
      toast({
        title: "Backup failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
      await load();
    } finally {
      setBusy(false);
      setSyncProgress(null);
    }
  };

  return (
    <section>
      {!embedded ? (
        <h2 className="font-display text-lg text-leather mb-3">Google Drive backup</h2>
      ) : (
        <h3 className="text-sm font-semibold mb-3">Google Drive backup</h3>
      )}
      <div className={embedded ? "rounded-xl border bg-card p-4 space-y-3 shadow-sm" : "rounded-lg border border-paper-edge bg-paper/70 p-4 space-y-3"}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
            <CloudUpload className="w-5 h-5 text-blue-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Auto-backup to Google Drive</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Copies journal photos, videos, voice memos, and artifact uploads into a{" "}
              <span className="font-medium">YourBible Vault</span> folder in your Google Drive.
              Only files created by this app are accessed.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            Checking connection…
          </div>
        ) : status?.connected ? (
          <div className="space-y-3">
            <p className="text-sm text-leather">
              Connected{status.googleEmail ? ` as ${status.googleEmail}` : ""}
              {status.lastSyncAt ? (
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Last full sync: {new Date(status.lastSyncAt).toLocaleString()}
                </span>
              ) : null}
              {status.lastSyncError ? (
                <span className="block text-xs text-destructive mt-0.5">
                  Last error: {status.lastSyncError}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void runSyncLoop()}>
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing…
                  </>
                ) : (
                  "Sync now"
                )}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void onDisconnect()}>
                Disconnect
              </Button>
            </div>
            {syncProgress ? (
              <p className="text-xs text-muted-foreground">{syncProgress}</p>
            ) : null}
          </div>
        ) : status?.configured ? (
          <Button type="button" disabled={busy} onClick={() => void onConnect()}>
            {busy ? "Redirecting…" : "Connect Google Drive"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Google Drive OAuth is not configured yet. Add{" "}
            <code className="text-[10px]">GOOGLE_OAUTH_CLIENT_ID</code> /{" "}
            <code className="text-[10px]">SECRET</code> and register redirect URI{" "}
            <code className="text-[10px]">…/google-drive-oauth-callback</code> in Google Cloud Console.
          </p>
        )}
      </div>
    </section>
  );
}
