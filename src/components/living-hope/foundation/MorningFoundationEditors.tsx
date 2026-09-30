import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MorningVoiceField } from "../MorningVoiceField";
import { MorningMemoryMedia } from "./MorningMemoryMedia";
import { SUGGESTED_HOPE_PRAYER, type MorningFoundation, type MorningMemory } from "@/lib/livingHope/morningFoundation";
import type { WorkbookStory } from "@/lib/livingHope/workbookTypes";

export function MorningFoundationEditor({ settings, onSave, onCancel }: {
  settings: MorningFoundation;
  onSave: (settings: MorningFoundation) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <form className="space-y-4" aria-label="Edit my morning foundation" onSubmit={(event) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError("");
    void onSave(draft).then(onCancel).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not save. Your edits are still here.")).finally(() => setSaving(false));
  }}>
    <fieldset disabled={saving} className="space-y-4">
      {([
        ["theme", "Theme for this season", "What is this season about?"],
        ["motto", "My motto", "One sentence to carry into the day."],
        ["question", "My daily question", "What question connects my beliefs to how I live today?"],
        ["hopePrayer", "My gratitude and hope prayer", "A personal prayer, not Scripture or a promise of an outcome."],
      ] as const).map(([key, label, placeholder]) => <div key={key} className="space-y-2"><p className="text-sm font-medium">{label}</p><MorningVoiceField label={label} value={draft[key]} onChange={(value) => setDraft((previous) => ({ ...previous, [key]: value }))} placeholder={placeholder} multiline={key === "hopePrayer"} rows={5} /></div>)}
      {!draft.hopePrayer.trim() && <Button type="button" variant="ghost" className="min-h-11 whitespace-normal" onClick={() => setDraft((previous) => ({ ...previous, hopePrayer: SUGGESTED_HOPE_PRAYER }))}>Use the suggested gratitude and hope prayer</Button>}
      <p className="text-xs leading-relaxed text-muted-foreground">These are your words, not generated facts or divine instructions. A question you have already answered stays attached to that answer; question edits then apply to a future morning.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11">{saving ? "Saving foundation…" : "Save my foundation"}</Button><Button type="button" variant="ghost" className="min-h-11" onClick={onCancel}>Cancel</Button></div>
    </fieldset>
  </form>;
}

export function MorningMemoryEditor({ memory, stories, onSave, onCancel }: {
  memory: MorningMemory | null;
  stories: WorkbookStory[];
  onSave: (memory: MorningMemory) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<MorningMemory>(() => memory ? { ...memory } : {
    id: crypto.randomUUID(), kind: "real_memory", title: "", body: "", happenedOn: "", photoPath: "", audioPath: "", sceneId: "",
  });
  const [confirmed, setConfirmed] = useState(Boolean(memory));
  const [mediaBusy, setMediaBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const valid = confirmed && draft.title.trim() && (draft.body.trim() || draft.photoPath || draft.audioPath);
  return <form className="space-y-4 rounded-2xl border border-border/70 p-4 sm:p-6" aria-label={memory ? "Edit a real memory" : "Save a real memory"} onSubmit={(event) => {
    event.preventDefault(); if (!valid || mediaBusy || saving) return;
    setSaving(true); setError("");
    void onSave({ ...draft, title: draft.title.trim() }).then(onCancel).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not save. Your memory is still here.")).finally(() => setSaving(false));
  }}>
    <h3 className="text-lg font-semibold">{memory ? "Edit this memory" : "Remember something real"}</h3>
    <p className="text-sm leading-relaxed text-muted-foreground">Choose something that actually happened: a moment of gratitude, provision, connection, or a response you want to practice again. A future hope belongs in Scenes.</p>
    <fieldset disabled={saving} className="space-y-4">
      <div className="space-y-2"><p className="text-sm font-medium">Memory title</p><MorningVoiceField label="Memory title" value={draft.title} onChange={(title) => setDraft((previous) => ({ ...previous, title }))} /></div>
      <div className="space-y-2"><p className="text-sm font-medium">What actually happened?</p><MorningVoiceField label="What actually happened?" value={draft.body} onChange={(body) => setDraft((previous) => ({ ...previous, body }))} multiline rows={5} placeholder="Describe the real moment. Where were you? Who was there? What did you appreciate?" /></div>
      <div className="space-y-2"><p className="text-sm font-medium">When it happened (optional)</p><MorningVoiceField label="When this memory happened" value={draft.happenedOn} onChange={(happenedOn) => setDraft((previous) => ({ ...previous, happenedOn }))} placeholder="An approximate date is fine." /></div>
      <MorningMemoryMedia memory={draft} onChange={(patch) => setDraft((previous) => ({ ...previous, ...patch }))} onBusyChange={setMediaBusy} />
      <label className="block space-y-2 text-sm font-medium"><span>Pair with a saved future scene (optional)</span><select className="min-h-11 w-full min-w-0 rounded-xl border bg-background p-3 text-foreground" aria-label="Paired future scene" value={draft.sceneId} onChange={(event) => setDraft((previous) => ({ ...previous, sceneId: event.target.value }))}>
        <option value="">No scene paired</option>{stories.map((story, index) => <option key={story.id} value={story.id}>{story.title || `Scene ${index + 1}`}</option>)}
      </select></label>
      {draft.sceneId && !stories.some((story) => story.id === draft.sceneId) && <p className="text-sm text-muted-foreground">The previously paired scene is no longer available. Choose another scene or leave it unpaired.</p>}
      <label className="flex min-h-11 items-center gap-3 text-sm leading-relaxed"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />This is a real memory I am describing, not an imagined future event.</label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!valid || mediaBusy || saving} className="min-h-11">{saving ? "Saving memory…" : "Save memory"}</Button><Button type="button" variant="ghost" disabled={mediaBusy || saving} className="min-h-11" onClick={onCancel}>Cancel</Button></div>
    </fieldset>
  </form>;
}
