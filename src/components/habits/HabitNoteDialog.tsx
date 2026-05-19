import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { HabitRow } from "@/lib/habits/api";

type Props = {
  open: boolean;
  habit: HabitRow | null;
  initialBody: string;
  onOpenChange: (open: boolean) => void;
  onSave: (body: string) => Promise<void>;
};

export function HabitNoteDialog({ open, habit, initialBody, onOpenChange, onSave }: Props) {
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setBody(initialBody);
  }, [open, initialBody]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(body);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{habit ? habit.name : "Note"}</DialogTitle>
          <DialogDescription>Monthly note pad for this habit.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Notes, reminders, or context for this month…"
          className="resize-none"
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
