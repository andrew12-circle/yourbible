import { useEffect, useState } from "react";
import { HardDrive, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import { useGoogleDriveOAuthReturnToast } from "@/hooks/useGoogleDriveOAuthReturnToast";
import { StorageMeterBar } from "@/components/settings/StorageMeterBar";
import { GoogleDriveBackupSection } from "@/components/settings/GoogleDriveBackupSection";
import {
  formatStorageBytes,
  storageMeterHint,
} from "@/lib/storage/storageMeter";

type Props = { embedded?: boolean };

export function StorageUsageSection({ embedded }: Props = {}) {
  const { usage, loading, error, reload } = useStorageUsage(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  const breakdown = usage?.breakdown;
  const journalDetail = breakdown
    ? `Photos ${formatStorageBytes(breakdown.journal_photos_bytes ?? 0)}, videos ${formatStorageBytes(breakdown.journal_videos_bytes ?? 0)}, voice ${formatStorageBytes(breakdown.voice_memos_bytes ?? 0)}`
    : undefined;
  const artifactsDetail = breakdown
    ? `PDFs, imports, and uploaded artifact files — ${formatStorageBytes(breakdown.artifact_uploads_bytes ?? 0)}`
    : undefined;
  const totalHint = usage ? storageMeterHint(usage.total_bytes) : null;

  return (
    <section className="space-y-8">
      <div>
        {!embedded ? (
          <h2 className="font-display text-lg text-leather mb-3">Storage</h2>
        ) : null}
        <Card className={embedded ? "border bg-card shadow-sm" : "border-paper-edge bg-paper/70"}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className={embedded ? "flex items-center gap-2 text-base" : "font-display text-leather flex items-center gap-2"}>
                  <HardDrive className="h-4 w-4" />
                  Supabase storage
                </CardTitle>
                <CardDescription>
                  How much of your cloud vault is in use. The meter runs from 0 to 20 GB so you can see when
                  to add space or turn on Google Drive backup.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void onRefresh()}
                disabled={loading || refreshing}
              >
                {loading || refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            {loading && !usage ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Measuring storage…
              </div>
            ) : usage ? (
              <>
                <StorageMeterBar
                  label="Total (journal + artifacts)"
                  bytes={usage.total_bytes}
                  detail={totalHint ?? `Journal ${formatStorageBytes(usage.journal_bytes)} + artifacts ${formatStorageBytes(usage.artifacts_bytes)}`}
                />
                <StorageMeterBar
                  label="Journal"
                  bytes={usage.journal_bytes}
                  detail={journalDetail}
                />
                <StorageMeterBar
                  label="Artifacts & imports"
                  bytes={usage.artifacts_bytes}
                  detail={artifactsDetail}
                />
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <GoogleDriveBackupSection embedded onSyncComplete={() => void reload()} />
    </section>
  );
}

export function StorageSettingsSection({ embedded }: Props = {}) {
  useGoogleDriveOAuthReturnToast();
  return <StorageUsageSection embedded={embedded} />;
}
