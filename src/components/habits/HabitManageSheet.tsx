import { useEffect, useState } from "react";
import { FileSpreadsheet, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { HabitRow } from "@/lib/habits/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: HabitRow[];
  onAdd: (name: string, category: string | null) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
  onImportDefaults?: () => Promise<void>;
};

export function HabitManageSheet({
  open,
  onOpenChange,
  habits,
  onAdd,
  onArchive,
  onReorder,
  onImportDefaults,
}: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setLocalOrder(habits.map((h) => h.id));
  }, [open, habits]);

  const habitById = new Map(habits.map((h) => [h.id, h]));
  const ordered = localOrder.map((id) => habitById.get(id)).filter(Boolean) as HabitRow[];

  const move = (index: number, dir: -1 | 1) => {
    const next = [...localOrder];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    setLocalOrder(next);
  };

  const submitAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onAdd(trimmed, category.trim() || null);
      setName("");
      setCategory("");
    } finally {
      setSaving(false);
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      await onReorder(localOrder);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] rounded-t-[22px] inset-x-auto left-1/2 right-auto w-full max-w-lg -translate-x-1/2"
      >
        <SheetHeader>
          <SheetTitle>Manage habits</SheetTitle>
          <SheetDescription>Add, reorder, or remove habits from your tracker.</SheetDescription>
        </SheetHeader>

        {onImportDefaults ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            disabled={saving}
            onClick={() => void onImportDefaults()}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Import habits from sheet
          </Button>
        ) : null}

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="habit-name">New habit</Label>
            <Input id="habit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Wake up at 6:00 am" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="habit-cat">Category (optional)</Label>
            <Input id="habit-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Morning" />
          </div>
          <Button type="button" className="w-full" disabled={saving || !name.trim()} onClick={() => void submitAdd()}>
            <Plus className="w-4 h-4 mr-2" />
            Add habit
          </Button>
        </div>

        <ul className="mt-4 space-y-2 max-h-[40vh] overflow-y-auto">
          {ordered.map((habit, i) => (
            <li
              key={habit.id}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-2 py-2"
            >
              <div className="flex flex-col">
                <button type="button" className="p-1 text-zinc-400" onClick={() => move(i, -1)} aria-label="Move up">
                  <GripVertical className="w-4 h-4 rotate-90" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{habit.name}</p>
                {habit.category ? <p className="text-xs text-muted-foreground truncate">{habit.category}</p> : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive"
                onClick={() => void onArchive(habit.id)}
                aria-label={`Remove ${habit.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <Button type="button" className="flex-1" disabled={saving} onClick={() => void saveOrder()}>
            Save order
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
