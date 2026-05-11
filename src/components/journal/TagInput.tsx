import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

export function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, "");
    if (!t) return;
    if (tags.includes(t)) return;
    onChange([...tags, t]);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 px-2 py-1.5 rounded-md border border-input bg-background">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
        >
          #{t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove tag ${t}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => {
          if (draft) {
            add(draft);
            setDraft("");
          }
        }}
        placeholder={tags.length ? "" : "Add tags…"}
        className="flex-1 min-w-[6rem] bg-transparent outline-none text-sm py-0.5"
      />
    </div>
  );
}