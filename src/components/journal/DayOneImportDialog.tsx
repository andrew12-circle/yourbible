import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Journal } from "@/lib/journal/journals";
import { importDayOneExport, uploadDayOneExportFile } from "@/lib/journal/dayOneImport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journals: Journal[];
  /** Pre-select a journal to import into (optional). */
  defaultJournalId?: string | null;
  onImported?: (journalId: string | null) => void;
}

export default function DayOneImportDialog({
  open,
  onOpenChange,
  journals,
  defaultJournalId = null,
  onImported,
}: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [targetMode, setTargetMode] = useState<"new" | "existing">(
    defaultJournalId ? "existing" : "new",
  );
  const [targetJournalId, setTargetJournalId] = useState<string>(
    defaultJournalId ?? journals[0]?.id ?? "",
  );
  const [newJournalName, setNewJournalName] = useState("Imported from Day One");

  const runImport = async (file: File) => {
    if (!user) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".zip") && !lower.endsWith(".json")) {
      toast({
        title: "Unsupported file",
        description: "Use a Day One JSON export (.json) or zip (.zip).",
        variant: "destructive",
      });
      return;
    }
    if (targetMode === "existing" && !targetJournalId) {
      toast({ title: "Choose a journal", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      toast({ title: "Uploading Day One export…", description: file.name });
      const storagePath = await uploadDayOneExportFile(user.id, file);
      toast({ title: "Importing entries…", description: "This may take a minute for large journals." });
      const res = await importDayOneExport({
        storagePath,
        targetJournalId: targetMode === "existing" ? targetJournalId : null,
        journalName: targetMode === "new" ? newJournalName.trim() || "Imported from Day One" : null,
      });
      if (!res?.ok) throw new Error("Import did not complete");

      const n = res.entries_imported ?? 0;
      const photos = res.photos_imported ?? 0;
      const desc =
        res.partial && res.message
          ? res.message
          : `Imported ${n} ${n === 1 ? "entry" : "entries"}${photos ? ` and ${photos} photos` : ""}.`;

      toast({ title: "Day One import complete", description: desc });
      onOpenChange(false);
      onImported?.(res.journal_id ?? res.journal_ids?.[0] ?? null);
    } catch (e) {
      toast({
        title: "Day One import failed",
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from Day One</DialogTitle>
          <DialogDescription>
            Use the JSON export from Day One (Settings → Import/Export → Export JSON). Upload the{" "}
            <code className="text-xs bg-muted px-1 rounded">.zip</code> or{" "}
            <code className="text-xs bg-muted px-1 rounded">Journal.json</code> file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Import into</Label>
            <Select
              value={targetMode}
              onValueChange={(v) => setTargetMode(v as "new" | "existing")}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New journal</SelectItem>
                <SelectItem value="existing">Existing journal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetMode === "new" ? (
            <div className="space-y-2">
              <Label htmlFor="dayone-journal-name">New journal name</Label>
              <Input
                id="dayone-journal-name"
                value={newJournalName}
                onChange={(e) => setNewJournalName(e.target.value)}
                disabled={busy}
                placeholder="Imported from Day One"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Journal</Label>
              <Select value={targetJournalId} onValueChange={setTargetJournalId} disabled={busy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select journal" />
                </SelectTrigger>
                <SelectContent>
                  {journals.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
            <FileUp className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Entries keep their original dates. Re-importing skips duplicates.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,.json,application/zip,application/json"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runImport(f);
              }}
            />
            <Button
              type="button"
              disabled={busy || (targetMode === "existing" && !targetJournalId)}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing…
                </>
              ) : (
                "Choose .zip or .json"
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
