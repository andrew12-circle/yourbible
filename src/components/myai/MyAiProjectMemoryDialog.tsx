import { useEffect, useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MyAiProjectRow } from "@/lib/myai/chatSections";
import {
  MY_AI_PROJECT_MEMORY_MAX_LENGTH,
  normalizeMyAiProjectMemory,
} from "@/lib/myai/chatProjects";

type Props = {
  open: boolean;
  project: MyAiProjectRow | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (memory: string) => void;
};

export default function MyAiProjectMemoryDialog({
  open,
  project,
  saving,
  onOpenChange,
  onSave,
}: Props) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(project?.memory ?? "");
  }, [open, project]);

  const normalized = normalizeMyAiProjectMemory(draft);
  const remaining = MY_AI_PROJECT_MEMORY_MAX_LENGTH - draft.length;
  const projectName = project?.name?.trim() || "Project";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-300" />
            Project memory
          </DialogTitle>
          <DialogDescription>
            Save what My AI should always remember whenever it answers inside "{projectName}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="my-ai-project-memory">What should stay connected?</Label>
          <Textarea
            id="my-ai-project-memory"
            value={draft}
            maxLength={MY_AI_PROJECT_MEMORY_MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Example: The goal is to build a Loom-like AI that never loses project context. Always connect new answers back to prior decisions, user fears, product goals, and saved constraints."
            className="min-h-48 resize-y leading-relaxed"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Stored with this project and injected into future My AI replies.</span>
            <span>{Math.max(0, remaining)} characters left</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSave(normalized)} disabled={saving || !project}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save memory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
