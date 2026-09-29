import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MorningVoiceField } from "../MorningVoiceField";
import { PrayerVoiceRecording } from "../PrayerVoiceRecording";
import { parseMorningFoundation } from "@/lib/livingHope/morningFoundation";
import { useMorningFoundation } from "./MorningFoundationContext";

const STARTING_PRAYER = `Father, in the name of Jesus, I give You this day. Send Your angels to guard my family, our home, our coming and going, and the people I am meant to help.

Angels of the Lord, carry out the assignments God gives you. Guard our paths. Stand against harm and confusion. Go before the conversations and work of this day, according to His will.

Holy Spirit, give me discernment and direct my steps. Keep my words truthful, my heart peaceful, and my actions faithful. I submit this day and every outcome to You. In Jesus' name, amen.`;

export function MorningAngelsPrayer() {
  const context = useMorningFoundation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(context); latest.current = context;
  const lock = context?.onEditingChange;
  useEffect(() => { lock?.(editing || saving || recordingBusy); return () => lock?.(false); }, [editing, saving, recordingBusy, lock]);
  if (!context) return null;
  const settings = parseMorningFoundation(context.workbook.morning_foundation);
  const prayer = context.day.angelPrayer || settings.angelPrayer || "";
  const saveRecording = async (path: string) => {
    const current = latest.current;
    if (!current) throw new Error("Your morning is not available.");
    await current.onSaveSettings({ ...parseMorningFoundation(current.workbook.morning_foundation), angelRecordingPath: path });
  };
  return <section className="mb-6 space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-6" aria-label="Angels and protection daily prayer">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Speak over this day</p><h2 className="mt-1 text-xl font-semibold">Angels &amp; protection</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">A dedicated place for your daily spoken prayer. Save the words, record them in your voice, then speak them aloud or listen and pray along each morning.</p></div>
    {editing ? <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault(); if (saving) return;
      setSaving(true); setError("");
      void context.onSaveSettings({ ...settings, angelPrayer: draft }).then(() => setEditing(false)).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not save prayer. Your words are still here.")).finally(() => setSaving(false));
    }}><fieldset disabled={saving} className="space-y-3"><MorningVoiceField label="My angels and protection prayer" value={draft} onChange={setDraft} multiline rows={8} /><div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11">{saving ? "Saving prayer…" : "Save this prayer"}</Button><Button type="button" variant="ghost" className="min-h-11" onClick={() => setEditing(false)}>Cancel</Button></div></fieldset></form> : <>
      {prayer ? <p className="whitespace-pre-wrap break-words font-serif text-lg leading-relaxed">{prayer}</p> : <p className="text-sm text-muted-foreground">Add your own words or start with an editable personal prayer. You can also record without writing a script.</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={recordingBusy} onClick={() => { setDraft(prayer); setEditing(true); }}>{prayer ? "Edit angels prayer" : "Write my prayer"}</Button>{!prayer && <Button type="button" variant="ghost" className="min-h-11" disabled={recordingBusy} onClick={() => { setDraft(STARTING_PRAYER); setEditing(true); }}>Use a starting prayer</Button>}</div>
    </>}
    {!editing && <PrayerVoiceRecording prayerKey="angels" label="angels prayer" storagePath={settings.angelRecordingPath} onStoragePathChange={saveRecording} onBusyChange={setRecordingBusy} />}
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={context.day.angelsPrayed === true} onChange={(event) => context.onDayChange({ angelsPrayed: event.target.checked, angelPrayer: prayer })} />I spoke this prayer aloud today</label>
    <p className="text-xs leading-relaxed text-muted-foreground">Personal prayer, not Scripture. Playback does not automatically mark this as prayed. Your existing covering and surrender recordings remain separate.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
