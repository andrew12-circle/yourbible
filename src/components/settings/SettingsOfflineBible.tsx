import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  countCachedChapters,
  downloadBibleForOffline,
  readOfflineBibleId,
  totalChapterCount,
  type OfflineDownloadProgress,
} from "@/lib/bible/bibleOfflineDownload";
import { SettingsCard } from "@/components/settings/SettingsSectionPanel";

type Props = {
  bibleId: string;
};

export function SettingsOfflineBible({ bibleId }: Props) {
  const [cached, setCached] = useState(0);
  const [progress, setProgress] = useState<OfflineDownloadProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const total = totalChapterCount();

  const refreshCount = useCallback(async () => {
    if (!bibleId) return;
    setCached(await countCachedChapters(bibleId));
  }, [bibleId]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  const startDownload = async () => {
    if (!bibleId || progress?.status === "running") return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await downloadBibleForOffline(bibleId, setProgress, abortRef.current.signal);
      toast({ title: "Bible saved for offline reading" });
      await refreshCount();
    } catch (err) {
      if (err instanceof Error && err.message === "Download cancelled") return;
      toast({
        variant: "destructive",
        title: "Download failed",
        description: err instanceof Error ? err.message : "Try again on Wi‑Fi.",
      });
    }
  };

  const offlineId = readOfflineBibleId();
  const pct = progress?.status === "running" ? Math.round((progress.done / total) * 100) : 0;

  return (
    <SettingsCard>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Download className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Label>Offline Bible</Label>
            <p className="text-xs text-muted-foreground">
              Download all {total} chapters for reading without internet.
              {cached > 0 ? ` ${cached} chapters cached.` : ""}
              {offlineId === bibleId && cached > 0 ? " Ready for offline use." : ""}
            </p>
          </div>
        </div>
        {progress?.status === "running" ? (
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Downloading… {progress.done} / {total}
            </p>
          </div>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={!bibleId || progress?.status === "running"}
          onClick={() => void startDownload()}
        >
          {progress?.status === "running" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading…
            </>
          ) : (
            "Download for offline"
          )}
        </Button>
      </div>
    </SettingsCard>
  );
}
