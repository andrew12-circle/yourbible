import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScriptureRef } from "@/lib/prayer/types";

export default function PrayerScriptureRefsInput({
  value,
  onChange,
}: {
  value: ScriptureRef[];
  onChange: (refs: ScriptureRef[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const ref = draft.trim();
    if (!ref) return;
    if (value.some((v) => v.ref.toLowerCase() === ref.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, { ref }]);
    setDraft("");
  };

  const remove = (ref: string) => {
    onChange(value.filter((v) => v.ref !== ref));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Philippians 4:19"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Add scripture">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((s) => (
            <li
              key={s.ref}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              {s.ref}
              <button
                type="button"
                onClick={() => remove(s.ref)}
                className="rounded-full p-0.5 hover:bg-background/80"
                aria-label={`Remove ${s.ref}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Add verses you are standing on.</p>
      )}
    </div>
  );
}
