import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseMorningFoundation, SUGGESTED_HOPE_PRAYER, type MorningMemory } from "@/lib/livingHope/morningFoundation";
import { livingHopeDaySeed } from "@/lib/livingHope/workbookProgress";
import { MorningVoiceField } from "../MorningVoiceField";
import { useMorningFoundation } from "./MorningFoundationContext";
import { MorningFoundationEditor, MorningMemoryEditor } from "./MorningFoundationEditors";
import { MorningMemoryPreview } from "./MorningMemoryMedia";

export function MorningFocusOpening() {
  const context = useMorningFoundation();
  const [editing, setEditing] = useState(false);
  const onEditingChange = context?.onEditingChange;
  useEffect(() => { onEditingChange?.(editing); return () => onEditingChange?.(false); }, [editing, onEditingChange]);
  if (!context) return null;
  const { day, workbook, onDayChange, onSaveSettings } = context;
  return <section className="mb-5 space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-6" aria-label="My personal morning foundation">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 space-y-2"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">This season</p><h2 className="break-words font-serif text-2xl leading-snug">{day.theme || "Give this season a clear direction."}</h2>{day.motto && <p className="break-words text-lg leading-relaxed">{day.motto}</p>}</div><Button type="button" variant="outline" className="min-h-11" aria-expanded={editing} onClick={() => setEditing((value) => !value)}>{editing ? "Cancel editing" : "Edit my foundation"}</Button></div>
    {!day.theme && !day.motto && <p className="text-sm leading-relaxed text-muted-foreground">Save a theme, a motto, and one meaningful question. All optional—your morning can begin without setup.</p>}
    {day.question && <div className="space-y-2"><h3 className="text-base font-semibold">{day.question}</h3><MorningVoiceField label="My answer to today's question" value={day.answer} onChange={(answer) => onDayChange({ answer })} placeholder="Speak or write a reflection. You can return to this later." multiline rows={2} /></div>}
    {!workbook.manifesto.length && <MorningIdentityAnchors />}
    {editing && <MorningFoundationEditor settings={parseMorningFoundation(workbook.morning_foundation)} onSave={onSaveSettings} onCancel={() => setEditing(false)} />}
  </section>;
}

export function MorningIdentityAnchors() {
  const context = useMorningFoundation();
  if (!context) return null;
  const { day, workbook } = context;
  const seed = livingHopeDaySeed();
  const quote = workbook.quotes[seed % Math.max(1, workbook.quotes.length)]?.text;
  const rule = workbook.rules_of_operation[seed % Math.max(1, workbook.rules_of_operation.length)];
  if (!day.motto && !quote && !rule) return null;
  return <aside className="my-4 space-y-3 rounded-xl border p-4" aria-label="My identity and operating reminders">
    {day.motto && <p className="text-base leading-relaxed"><strong>My motto: </strong>{day.motto}</p>}
    {quote && <p className="text-base leading-relaxed"><strong>From my saved quotes: </strong>{quote}</p>}
    {rule && <p className="text-base leading-relaxed"><strong>How I will act: </strong>{rule}</p>}
  </aside>;
}

export function MorningRealMemories() {
  const context = useMorningFoundation();
  const [editor, setEditor] = useState<MorningMemory | "new" | null>(null);
  const onEditingChange = context?.onEditingChange;
  useEffect(() => { onEditingChange?.(Boolean(editor)); return () => onEditingChange?.(false); }, [editor, onEditingChange]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!context) return null;
  const { workbook, day, onDayChange, onSaveMemories, onSelectScene } = context;
  const memories = workbook.morning_memories ?? [];
  const paired = workbook.stories.find((story) => story.id === day.memory?.sceneId);
  const choose = (memory: MorningMemory) => {
    if (day.memory?.id !== memory.id && day.memoryReflection.trim() && !window.confirm("Switch memories and clear the reflection you wrote for the previous memory?")) return;
    onDayChange({ memory: { ...memory }, memoryReflection: day.memory?.id === memory.id ? day.memoryReflection : "" });
  };
  return <section className="mt-5 space-y-4 rounded-2xl border border-border/70 p-4 sm:p-6" aria-label="Real memories for gratitude">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Remember before you imagine.</h2><p className="mt-1 text-sm text-muted-foreground">One real moment to appreciate. No need to add another journal entry.</p></div><Button type="button" variant="outline" className="min-h-11" disabled={Boolean(editor) || busy} onClick={() => setEditor("new")}>Add a real memory</Button></div>
    {!memories.length && !editor && <p className="text-sm leading-relaxed text-muted-foreground">Your memory collection is empty. Add a moment that actually happened, or continue with gratitude today. Nothing is invented or filled in for you.</p>}
    {editor && <MorningMemoryEditor key={editor === "new" ? "new" : editor.id} memory={editor === "new" ? null : editor} stories={workbook.stories} onCancel={() => setEditor(null)} onSave={async (memory) => {
      const exists = memories.some((item) => item.id === memory.id);
      await onSaveMemories(exists ? memories.map((item) => item.id === memory.id ? memory : item) : [...memories, memory]);
    }} />}
    {memories.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{memories.map((memory) => <article key={memory.id} className="min-w-0 space-y-3 rounded-xl border bg-background p-3">
      <MorningMemoryPreview memory={memory} compact />
      <h3 className="break-words text-base font-semibold">{memory.title}</h3>
      {memory.happenedOn && <p className="text-xs text-muted-foreground">{memory.happenedOn}</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant={day.memory?.id === memory.id ? "default" : "outline"} className="min-h-11" disabled={Boolean(editor) || busy} aria-pressed={day.memory?.id === memory.id} onClick={() => choose(memory)}>{day.memory?.id === memory.id ? "Selected for today" : "Recall this memory"}</Button><Button type="button" variant="ghost" className="min-h-11" disabled={Boolean(editor) || busy} onClick={() => setEditor(memory)} aria-label={`Edit memory ${memory.title}`}>Edit</Button><Button type="button" variant="ghost" className="min-h-11" disabled={Boolean(editor) || busy} onClick={() => setDeleting(memory.id)} aria-label={`Remove memory ${memory.title}`}>Remove</Button></div>
      {deleting === memory.id && <div className="space-y-2 rounded-lg border p-3"><p className="text-sm">Remove this saved memory? Earlier morning snapshots and their media stay intact.</p><Button type="button" variant="destructive" disabled={busy} className="min-h-11" onClick={() => {
        setBusy(true); setError(""); void onSaveMemories(memories.filter((item) => item.id !== memory.id)).then(() => setDeleting(null)).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not remove memory.")).finally(() => setBusy(false));
      }}>Confirm removal</Button><Button type="button" variant="ghost" disabled={busy} className="min-h-11" onClick={() => setDeleting(null)}>Keep memory</Button></div>}
    </article>)}</div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {day.memory && <article className="space-y-4 rounded-xl bg-muted/30 p-4" aria-label="Today's real memory">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remember · a real memory you selected</p><h3 className="mt-1 text-lg font-semibold">{day.memory.title}</h3></div>
      <MorningMemoryPreview memory={day.memory} />
      {day.memory.body && <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{day.memory.body}</p>}
      <MorningVoiceField label="What I remember and appreciate" value={day.memoryReflection} onChange={(memoryReflection) => onDayChange({ memoryReflection })} placeholder="What happened? What did that moment feel like? What do you appreciate now?" multiline rows={3} />
      {paired ? <div className="space-y-2"><p className="text-sm">Paired future scene: <strong>{paired.title || "Untitled scene"}</strong></p><Button type="button" variant="outline" className="min-h-11" onClick={() => onSelectScene(paired.id)}>Use this paired scene today</Button><p className="text-xs text-muted-foreground">A future hope—not evidence that the outcome has already happened.</p></div> : day.memory.sceneId ? <p className="text-sm text-muted-foreground">The paired scene is no longer available. Your real memory is preserved.</p> : null}
    </article>}
  </section>;
}

export function MorningMemorySceneBridge() {
  const context = useMorningFoundation();
  if (!context || !context.day.memory) return null;
  const { workbook, day, onSelectScene, selectedSceneId } = context;
  return <aside className="mb-4 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4" aria-label="Connect memory and future scene">
    <p className="text-sm leading-relaxed"><strong>Remember: </strong>{day.memory.title}</p>
    <p className="text-sm leading-relaxed">Now practice how you want to live. Notice what you do and how you respond, not only what you hope to have.</p>
    <label className="block space-y-2 text-sm font-medium"><span>Imagine · today's saved future scene</span><select className="min-h-11 w-full min-w-0 rounded-xl border bg-background p-3 text-foreground" aria-label="Today's future scene" value={selectedSceneId} onChange={(event) => onSelectScene(event.target.value)}><option value="">Choose a saved scene</option>{workbook.stories.map((story, index) => <option key={story.id} value={story.id}>{story.title || `Scene ${index + 1}`}</option>)}</select></label>
    {!workbook.stories.length && <p className="text-sm text-muted-foreground">No saved scenes yet. Add one in the scene step. Your memory is not converted into an imagined event.</p>}
  </aside>;
}

export function MorningActionBridge() {
  const context = useMorningFoundation();
  if (!context) return null;
  return <section className="mt-5 space-y-3 rounded-xl border border-primary/20 p-4" aria-label="Bring this morning into today"><h3 className="text-lg font-semibold">What can I practice today?</h3><p className="text-sm text-muted-foreground">Name one real action that connects what you remembered and imagined to how you will live today.</p><MorningVoiceField label="My action from this morning" value={context.day.action} onChange={(action) => context.onDayChange({ action })} placeholder="What will I do, and when?" multiline rows={2} /><p className="text-xs leading-relaxed text-muted-foreground">When you continue, this fills “The one thing” only if it is blank. An existing assignment is never replaced.</p></section>;
}

export function MorningHopePrayer() {
  const context = useMorningFoundation();
  if (!context) return null;
  return <details className="my-4 rounded-xl border p-4"><summary className="min-h-11 cursor-pointer text-base font-semibold">Gratitude and hope prayer · optional</summary><p className="mt-3 whitespace-pre-wrap font-serif text-lg leading-relaxed">{context.day.hopePrayer || SUGGESTED_HOPE_PRAYER}</p><p className="mt-3 text-xs text-muted-foreground">{context.day.hopePrayer ? "Your saved personal prayer" : "Suggested personal prayer"}—not Scripture, a claimed answered prayer, or a guarantee of an outcome. Your surrender and covering prayers remain unchanged.</p></details>;
}
