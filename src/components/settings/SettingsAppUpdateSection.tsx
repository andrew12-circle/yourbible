import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/SettingsSectionPanel";
import { toast } from "@/hooks/use-toast";
import { forceAppRefresh } from "@/lib/pwa/forceAppRefresh";

/**
 * Manual escape hatch when the installed PWA is stuck on an old cached build.
 */
export function SettingsAppUpdateSection() {
  const [busy, setBusy] = useState(false);

  const onRefresh = async () => {
    setBusy(true);
    toast({
      title: "Refreshing…",
      description: "Clearing the app cache and loading the latest version.",
    });
    try {
      await forceAppRefresh();
    } catch (err) {
      setBusy(false);
      toast({
        variant: "destructive",
        title: "Couldn't refresh",
        description: err instanceof Error ? err.message : "Try closing and reopening the app.",
      });
    }
  };

  return (
    <SettingsCard className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-sm font-medium">App updates</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          If the app looks stuck on an old version, refresh to clear the cache and load the latest.
          You stay signed in.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="gap-2 shrink-0"
        disabled={busy}
        onClick={() => void onRefresh()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Refresh app
      </Button>
    </SettingsCard>
  );
}
