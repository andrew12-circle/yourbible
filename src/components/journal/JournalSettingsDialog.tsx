import { useEffect, useState } from "react";
import { Journal, JOURNAL_COLORS, updateJournal } from "@/lib/journal/journals";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  journal: Journal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function JournalSettingsDialog({ journal, open, onOpenChange, onSaved }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(JOURNAL_COLORS[0].value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!journal) return;
    setName(journal.name);
    setColor(journal.color);
  }, [journal, open]);

  const save = async () => {
    if (!journal || !name.trim()) return;
    setSaving(true);
    await updateJournal(journal.id, { name: name.trim(), color });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Journal settings</DialogTitle>
        </DialogHeader>
        <SettingsFields name={name} setName={setName} color={color} setColor={setColor} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim() || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsFields({
  name,
  setName,
  color,
  setColor,
}: {
  name: string;
  setName: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[13px] font-medium text-muted-foreground">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus />
      </div>
      <div>
        <label className="text-[13px] font-medium text-muted-foreground">Accent color</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {JOURNAL_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-9 h-9 rounded-xl ring-offset-2 transition ${
                color === c.value ? "ring-2 ring-foreground" : ""
              }`}
              style={{ background: `hsl(${c.value})` }}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
