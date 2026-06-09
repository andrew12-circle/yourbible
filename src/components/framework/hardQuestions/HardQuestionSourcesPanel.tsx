import { useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import type { HardQuestionSourceRow } from "@/lib/framework/hardQuestions";

type Props = {
  sources: HardQuestionSourceRow[];
  onAdd: (input: {
    label: string;
    kind: HardQuestionSourceRow["kind"];
    snippet?: string;
    url?: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function HardQuestionSourcesPanel({ sources, onAdd, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [snippet, setSnippet] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!label.trim()) return;
    setBusy(true);
    await onAdd({
      label: label.trim(),
      kind: url.trim() ? "link" : "note",
      url: url.trim() || undefined,
      snippet: snippet.trim() || undefined,
    });
    setLabel("");
    setUrl("");
    setSnippet("");
    setOpen(false);
    setBusy(false);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Gathered sources">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">What you&apos;ve gathered</h3>
          <p className="text-xs text-muted-foreground">Links, notes, and voices to feed the research pack.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {open ? (
        <div className="mb-4 space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/20 p-3">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Tim Keller on suffering)" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" type="url" />
          <PolishedTextarea
            value={snippet}
            onChange={(e) => setSnippet(e.target.value)}
            rows={3}
            placeholder="Snippet or what they said…"
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy || !label.trim()} onClick={() => void submit()}>
              Save source
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sources yet — add links or notes from what people are saying.</p>
      ) : (
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="flex items-start gap-2 rounded-md border border-border/50 bg-background/80 p-2.5 text-sm">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{s.label}</p>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline-offset-2 hover:underline break-all"
                  >
                    {s.url}
                  </a>
                ) : null}
                {s.snippet ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">{s.snippet}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void onDelete(s.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remove source"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
