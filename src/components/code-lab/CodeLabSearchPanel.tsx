import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCOPE_KIND_OPTIONS, bookOptions } from "@/lib/code-lab/scope";
import type { CodeLabScope, TextProfileId } from "@/lib/code-lab/types";
import type { BibleEntry } from "@/lib/bible/api";

interface CodeLabSearchPanelProps {
  bibles: BibleEntry[];
  bibleId: string;
  onBibleIdChange: (id: string) => void;
  compareBibleId: string | null;
  onCompareBibleIdChange: (id: string | null) => void;
  term: string;
  onTermChange: (v: string) => void;
  minSkip: number;
  onMinSkipChange: (v: number) => void;
  maxSkip: number;
  onMaxSkipChange: (v: number) => void;
  scope: CodeLabScope;
  onScopeChange: (s: CodeLabScope) => void;
  profileOverride: TextProfileId | "auto";
  onProfileOverrideChange: (p: TextProfileId | "auto") => void;
  onDocumentaryPreset: () => void;
}

export function CodeLabSearchPanel({
  bibles,
  bibleId,
  onBibleIdChange,
  compareBibleId,
  onCompareBibleIdChange,
  term,
  onTermChange,
  minSkip,
  onMinSkipChange,
  maxSkip,
  onMaxSkipChange,
  scope,
  onScopeChange,
  profileOverride,
  onProfileOverrideChange,
  onDocumentaryPreset,
}: CodeLabSearchPanelProps) {
  const books = bookOptions();

  const updateScope = (patch: Partial<CodeLabScope>) => {
    onScopeChange({ ...scope, ...patch });
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-sm font-medium">Skip-code search</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Equidistant letter sequences (ELS). Search any translation or manuscript profile.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="code-lab-bible">Primary Bible</Label>
          <Select value={bibleId} onValueChange={onBibleIdChange}>
            <SelectTrigger id="code-lab-bible">
              <SelectValue placeholder="Select Bible" />
            </SelectTrigger>
            <SelectContent>
              {bibles.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.abbreviation} — {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="code-lab-compare">Compare with (optional)</Label>
          <Select
            value={compareBibleId ?? "__none__"}
            onValueChange={(v) => onCompareBibleIdChange(v === "__none__" ? null : v)}
          >
            <SelectTrigger id="code-lab-compare">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {bibles.filter((b) => b.id !== bibleId).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.abbreviation} — {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="code-lab-scope">Scope</Label>
          <Select
            value={scope.kind}
            onValueChange={(kind) =>
              updateScope({
                kind: kind as CodeLabScope["kind"],
                book: scope.book ?? "Gen",
                chapter: scope.chapter ?? 1,
              })
            }
          >
            <SelectTrigger id="code-lab-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_KIND_OPTIONS.map((o) => (
                <SelectItem key={o.kind} value={o.kind}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="code-lab-profile">Letter profile</Label>
          <Select
            value={profileOverride}
            onValueChange={(v) => onProfileOverrideChange(v as TextProfileId | "auto")}
          >
            <SelectTrigger id="code-lab-profile">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (from Bible language)</SelectItem>
              <SelectItem value="latin-letters">Latin A–Z</SelectItem>
              <SelectItem value="hebrew-consonants">Hebrew consonants</SelectItem>
              <SelectItem value="ethiopic">Ethiopic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(scope.kind === "passage" || scope.kind === "book") && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Book</Label>
            <Select
              value={scope.book ?? "Gen"}
              onValueChange={(book) => updateScope({ book })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {books.map((b) => (
                  <SelectItem key={b.abbr} value={b.abbr}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {scope.kind === "passage" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="code-lab-ch">Chapter</Label>
                <Input
                  id="code-lab-ch"
                  type="number"
                  min={1}
                  value={scope.chapter ?? 1}
                  onChange={(e) => updateScope({ chapter: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code-lab-verses">Verses (optional)</Label>
                <div className="flex gap-1 items-center">
                  <Input
                    id="code-lab-verses"
                    type="number"
                    min={1}
                    placeholder="from"
                    value={scope.verseStart ?? ""}
                    onChange={(e) =>
                      updateScope({
                        verseStart: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                  <span className="text-muted-foreground text-xs">–</span>
                  <Input
                    type="number"
                    min={1}
                    placeholder="to"
                    value={scope.verseEnd ?? ""}
                    onChange={(e) =>
                      updateScope({
                        verseEnd: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="code-lab-term">Search term</Label>
        <Input
          id="code-lab-term"
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder="Letters only after normalization (e.g. TIMOTHY or Hebrew)"
          dir="auto"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="code-lab-min-skip">Min skip</Label>
          <Input
            id="code-lab-min-skip"
            type="number"
            min={1}
            value={minSkip}
            onChange={(e) => onMinSkipChange(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code-lab-max-skip">Max skip</Label>
          <Input
            id="code-lab-max-skip"
            type="number"
            min={1}
            value={maxSkip}
            onChange={(e) => onMaxSkipChange(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>

      <button
        type="button"
        className="text-xs text-primary underline-offset-2 hover:underline"
        onClick={onDocumentaryPreset}
      >
        Documentary preset: Genesis 30, skip 16 (Hebrew profile)
      </button>
    </div>
  );
}
