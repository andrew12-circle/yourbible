import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  reference: string;
  initialBody?: string;
  onClose: () => void;
  onSave: (body: string) => void;
  onDelete?: () => void;
}

export function NoteDialog({ open, reference, initialBody, onClose, onSave, onDelete }: Props) {
  const [body, setBody] = useState(initialBody ?? "");
  useEffect(() => { setBody(initialBody ?? ""); }, [initialBody, open]);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="paper-texture border-gold/40">
        <DialogHeader>
          <div className="text-[10px] uppercase tracking-widest text-gold-deep">Note</div>
          <DialogTitle className="font-display text-leather">{reference}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={body} onChange={e => setBody(e.target.value)} rows={6}
          placeholder="What does this verse mean to you right now…" autoFocus
          className="font-scripture text-base bg-paper/70"
        />
        <DialogFooter className="gap-2">
          {onDelete && initialBody && (
            <Button variant="ghost" onClick={() => { onDelete(); onClose(); }} className="text-destructive mr-auto">Delete</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(body.trim()); onClose(); }} disabled={!body.trim()} className="leather-texture text-gold-bright">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
