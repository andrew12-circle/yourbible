import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RIBBON_COLORS } from "@/lib/bible/palettes";

interface Props {
  open: boolean;
  position: 1 | 2 | 3;
  defaultLabel?: string;
  defaultColor?: "red" | "gold" | "blue";
  defaultRef: { book: string; bookName: string; chapter: number };
  onClose: () => void;
  onSave: (label: string, color: "red" | "gold" | "blue") => void;
}

export function BookmarkDialog({ open, position, defaultLabel, defaultColor, defaultRef, onClose, onSave }: Props) {
  const [label, setLabel] = useState(defaultLabel ?? `${defaultRef.bookName} ${defaultRef.chapter}`);
  const [color, setColor] = useState<"red" | "gold" | "blue">(defaultColor ?? (position === 1 ? "red" : position === 2 ? "gold" : "blue"));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="paper-texture border-gold/40">
        <DialogHeader>
          <div className="text-[10px] uppercase tracking-widest text-gold-deep">Ribbon {position}</div>
          <DialogTitle className="font-display text-leather">Bookmark this page</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">{defaultRef.bookName} {defaultRef.chapter}</div>
          <div className="space-y-2">
            <Label htmlFor="rb-label">Name</Label>
            <Input id="rb-label" value={label} onChange={e => setLabel(e.target.value)} className="bg-paper/70" />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {RIBBON_COLORS.map(c => (
                <button key={c.id} onClick={() => setColor(c.id as "red" | "gold" | "blue")}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${color === c.id ? "border-leather scale-110" : "border-paper hover:scale-105"}`}
                  style={{ background: c.hex }} aria-label={c.label}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(label.trim() || `Ribbon ${position}`, color)} className="leather-texture text-gold-bright">Save ribbon</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
