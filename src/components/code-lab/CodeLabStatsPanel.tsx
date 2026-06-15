import { Button } from "@/components/ui/button";
import type { ControlResult } from "@/lib/code-lab/statistics";
import { Download } from "lucide-react";

interface CodeLabStatsPanelProps {
  searchCount: number;
  streamLength: number | null;
  controlResult: ControlResult | null;
  profileLabel: string;
  onExport: () => void;
  onSaveHistory: () => void;
  canExport: boolean;
}

export function CodeLabStatsPanel({
  searchCount,
  streamLength,
  controlResult,
  profileLabel,
  onExport,
  onSaveHistory,
  canExport,
}: CodeLabStatsPanelProps) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
      <h3 className="font-medium">Research controls</h3>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
        <li>Profile: {profileLabel}</li>
        {streamLength != null && (
          <li>Letter stream length: {streamLength.toLocaleString()}</li>
        )}
        <li>Skip searches run this session: {searchCount.toLocaleString()}</li>
        {controlResult && (
          <li>
            Shuffled control at selected skip: {controlResult.shuffledHitCount} hit(s).{" "}
            {controlResult.note}
          </li>
        )}
        <li>
          Searching many terms and skips increases chance finds — compare against shuffled text.
        </li>
      </ul>
      {canExport && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onSaveHistory}>
            Save to history
          </Button>
        </div>
      )}
    </div>
  );
}
